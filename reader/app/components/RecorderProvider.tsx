"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type Phase = "idle" | "starting" | "recording" | "finishing" | "waiting" | "ingested" | "interrupted" | "error";
type PendingChunk = { index: number; blob: Blob };
type SessionMeta = { id: string; deliveryDate: string; editionVersion: string; mimeType: string; startedAt: number };
type SessionStatusResponse = { id?: string; status: "recording" | "waiting" | "ingested" | null; deliveryDate?: string; editionVersion?: string; mimeType?: string; startedAt?: string; totalChunks?: number };
type RecorderContextValue = { active: boolean };

const RecorderContext = createContext<RecorderContextValue>({ active: false });
const ACTIVE_SESSION_KEY = "arxiv-daily-brief.active-voice-session.v1";
const DB_NAME = "arxiv-daily-brief-recorder";
const STORE_NAME = "pending-chunks";

function openChunkDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: ["sessionId", "index"] });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeChunk(sessionId: string, chunk: PendingChunk) {
  const db = await openChunkDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({ sessionId, index: chunk.index, blob: chunk.blob });
    transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function removeChunk(sessionId: string, index: number) {
  const db = await openChunkDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete([sessionId, index]);
    transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function loadChunks(sessionId: string): Promise<PendingChunk[]> {
  const db = await openChunkDb();
  const rows = await new Promise<Array<{ sessionId: string; index: number; blob: Blob }>>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  db.close();
  return rows.filter((row) => row.sessionId === sessionId).map(({ index, blob }) => ({ index, blob })).sort((a, b) => a.index - b.index);
}

export function RecorderProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const edition = useMemo(() => {
    const match = pathname.match(/^\/edition\/(\d{4}-\d{2}-\d{2})\/(v\d+)$/);
    return match ? { deliveryDate: match[1], editionVersion: match[2] } : null;
  }, [pathname]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState("Ready");
  const [warning, setWarning] = useState<string | null>(null);
  const [sessionMeta, setSessionMeta] = useState<SessionMeta | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<SessionMeta | null>(null);
  const queueRef = useRef<PendingChunk[]>([]);
  const uploadingRef = useRef(false);
  const nextIndexRef = useRef(0);
  const finishResolverRef = useRef<(() => void) | null>(null);
  const dataTasksRef = useRef<Set<Promise<void>>>(new Set());
  const intentionalStopRef = useRef(false);

  const persistSession = (meta: SessionMeta | null) => {
    sessionRef.current = meta; setSessionMeta(meta);
    if (meta) localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(meta));
    else localStorage.removeItem(ACTIVE_SESSION_KEY);
  };

  const drainQueue = useCallback(async () => {
    if (uploadingRef.current || !sessionRef.current) return;
    uploadingRef.current = true;
    while (queueRef.current.length && sessionRef.current) {
      const item = queueRef.current[0];
      try {
        const response = await fetch(`/api/voice/sessions/${sessionRef.current.id}/chunks/${item.index}`, {
          method: "PUT", headers: { "content-type": item.blob.type || "application/octet-stream" }, body: item.blob,
        });
        if (!response.ok) throw new Error("upload failed");
        queueRef.current.shift();
        await removeChunk(sessionRef.current.id, item.index);
        setMessage(queueRef.current.length ? `Uploading · ${queueRef.current.length}` : "Saved");
      } catch {
        setMessage("Offline · saved");
        await new Promise((resolve) => window.setTimeout(resolve, 3000));
      }
    }
    uploadingRef.current = false;
    finishResolverRef.current?.(); finishResolverRef.current = null;
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!saved) return;
    try {
      const meta = JSON.parse(saved) as SessionMeta;
      sessionRef.current = meta;
      fetch(`/api/voice/sessions?session=${encodeURIComponent(meta.id)}`)
        .then((response) => response.ok ? response.json() as Promise<SessionStatusResponse> : null)
        .then(async (data) => {
          if (!data) return;
          setSessionMeta(meta);
          if (data.status === "recording") {
            queueRef.current = await loadChunks(meta.id);
            nextIndexRef.current = Math.max(data.totalChunks || 0, ...queueRef.current.map((chunk) => chunk.index + 1), 0);
            if (queueRef.current.length) await drainQueue();
            setPhase("interrupted"); setMessage(`${data.totalChunks || 0} chunks`);
          } else {
            persistSession(null); setPhase(data.status === "ingested" ? "ingested" : "waiting");
            setMessage(data.status === "ingested" ? "Ingested" : "Pending");
          }
        }).catch(() => { setSessionMeta(meta); setPhase("interrupted"); setMessage("Checking"); });
    } catch { localStorage.removeItem(ACTIVE_SESSION_KEY); }
  }, [drainQueue]);

  useEffect(() => {
    if (!edition || phase !== "idle") return;
    fetch(`/api/voice/sessions?date=${edition.deliveryDate}&version=${edition.editionVersion}`)
      .then((response) => response.ok ? response.json() as Promise<SessionStatusResponse> : null)
      .then((data) => {
        if (data?.status === "recording") {
          if (!data.id || !data.deliveryDate || !data.editionVersion || !data.mimeType || !data.startedAt) return;
          const meta = { id: data.id, deliveryDate: data.deliveryDate, editionVersion: data.editionVersion, mimeType: data.mimeType, startedAt: Date.parse(data.startedAt) };
          persistSession(meta); setPhase("interrupted"); setMessage(`${data.totalChunks || 0} chunks`);
        } else if (data?.status === "ingested") { setPhase("ingested"); setMessage("Ingested"); }
        else if (data?.status === "waiting") { setPhase("waiting"); setMessage("Pending"); }
      }).catch(() => {});
  }, [edition, phase]);

  useEffect(() => {
    if (phase !== "recording" || !sessionMeta) return;
    const tick = window.setInterval(() => setElapsed(Math.floor((Date.now() - sessionMeta.startedAt) / 1000)), 1000);
    return () => window.clearInterval(tick);
  }, [phase, sessionMeta]);

  const active = phase === "recording" || phase === "finishing";
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (active) { event.preventDefault(); event.returnValue = ""; } };
    const pageHide = () => {
      if (!active || !sessionRef.current) return;
      try { recorderRef.current?.requestData(); } catch {}
      navigator.sendBeacon(`/api/voice/sessions/${sessionRef.current.id}/recover`);
    };
    const visibility = () => { if (active && document.hidden) setWarning("Leaving may stop recording. Uploaded audio is safe."); };
    const click = (event: MouseEvent) => {
      if (!active) return;
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor?.href) return;
      const url = new URL(anchor.href, window.location.href);
      const internalRoute = url.origin === window.location.origin && (/^\/$/.test(url.pathname) || /^\/archive\/?$/.test(url.pathname) || /^\/edition\//.test(url.pathname));
      if (internalRoute) return;
      event.preventDefault();
      setWarning("Leaving may stop recording. Uploaded audio is safe.");
      if (window.confirm("Leave while recording?")) window.open(url.href, anchor.target || "_blank", "noopener,noreferrer");
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("pagehide", pageHide);
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); window.removeEventListener("pagehide", pageHide); document.removeEventListener("visibilitychange", visibility); document.removeEventListener("click", click, true); };
  }, [active]);

  const start = async () => {
    if (!edition) return;
    setPhase("starting"); setMessage("Mic");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const preferred = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type));
      const response = await fetch("/api/voice/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...edition, mimeType: preferred || "audio/webm" }) });
      if (!response.ok) throw new Error("Could not create voice session");
      const { id } = await response.json() as { id: string };
      const meta = { id, ...edition, mimeType: preferred || "audio/webm", startedAt: Date.now() };
      persistSession(meta); nextIndexRef.current = 0;
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      recorderRef.current = recorder;
      recorder.addEventListener("dataavailable", (event) => {
        if (!event.data.size || !sessionRef.current) return;
        const sessionId = sessionRef.current.id;
        const task = (async () => {
          const chunk = { index: nextIndexRef.current++, blob: event.data };
          await storeChunk(sessionId, chunk);
          queueRef.current.push(chunk); await drainQueue();
        })();
        dataTasksRef.current.add(task);
        void task.finally(() => dataTasksRef.current.delete(task));
      });
      const unexpectedStop = () => {
        if (intentionalStopRef.current) return;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        recorderRef.current = null; streamRef.current = null;
        setPhase("interrupted"); setMessage("Stopped");
      };
      recorder.addEventListener("stop", unexpectedStop);
      recorder.start(10000);
      setElapsed(0); setWarning(null); setPhase("recording"); setMessage("Saved");
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setPhase("error"); setMessage(error instanceof Error && error.message.includes("session") ? "Session failed" : "Mic unavailable");
    }
  };

  const finish = async () => {
    const recorder = recorderRef.current, meta = sessionRef.current;
    if (!recorder || !meta) return;
    setPhase("finishing"); setMessage("Uploading");
    intentionalStopRef.current = true;
    const stopped = new Promise<void>((resolve) => recorder.addEventListener("stop", () => resolve(), { once: true }));
    recorder.stop(); await stopped; streamRef.current?.getTracks().forEach((track) => track.stop());
    if (dataTasksRef.current.size) await Promise.all([...dataTasksRef.current]);
    if (queueRef.current.length || uploadingRef.current) await new Promise<void>((resolve) => { finishResolverRef.current = resolve; void drainQueue(); });
    const response = await fetch(`/api/voice/sessions/${meta.id}/finish`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ durationMs: elapsed * 1000 }) });
    if (!response.ok) { setPhase("error"); setMessage("Retry Finish"); return; }
    recorderRef.current = null; streamRef.current = null; intentionalStopRef.current = false;
    persistSession(null); setWarning(null); setPhase("waiting"); setMessage("Pending");
  };

  const recover = async () => {
    const meta = sessionRef.current;
    if (!meta) return;
    setPhase("finishing"); setMessage("Uploading");
    queueRef.current = await loadChunks(meta.id); if (queueRef.current.length) await drainQueue();
    const response = await fetch(`/api/voice/sessions/${meta.id}/recover`, { method: "POST" });
    if (!response.ok) { setPhase("error"); setMessage("Retry Save"); return; }
    persistSession(null); setWarning(null); setPhase("waiting"); setMessage("Pending");
  };

  const time = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const showDock = Boolean(edition) || phase !== "idle";
  const status = phase === "recording" ? message : phase === "finishing" ? "Uploading" : phase === "waiting" ? "Pending" : phase === "ingested" ? "Ingested" : phase === "interrupted" ? "Interrupted" : phase === "error" ? "Error" : phase === "starting" ? "Mic" : "Ready";
  const provenance = sessionMeta ? `${sessionMeta.deliveryDate} · ${sessionMeta.editionVersion}` : "";
  return <RecorderContext.Provider value={{ active }}>
    {children}
    {warning && active ? <aside className="recording-warning" role="alert">{warning}<button onClick={() => setWarning(null)} aria-label="Dismiss recording warning">×</button></aside> : null}
    {showDock ? <div className="recorder-dock" role="region" aria-label="Daily voice memo"><div className="recorder">
      <span className={`record-dot ${active ? "live" : ""}`} aria-hidden="true" />
      {phase === "recording" ? <button className="record-button finish" onClick={finish}>Finish</button> :
        phase === "finishing" ? <button className="record-button" disabled>Saving…</button> :
        phase === "interrupted" ? <button className="record-button recover" onClick={recover}>Save</button> :
        <button className="record-button" onClick={start} disabled={!edition || phase === "starting" || phase === "waiting" || phase === "ingested"} aria-label="Start daily voice memo">Record</button>}
      <div className="record-status" aria-live="polite"><strong>{status}</strong>{provenance ? <span>{provenance}</span> : null}</div>
      <span className="timer" aria-label={`${elapsed} seconds elapsed`}>{time}</span>
    </div></div> : null}
  </RecorderContext.Provider>;
}

export function useRecorderActive() { return useContext(RecorderContext).active; }
