#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runsRoot = path.join(root, "runs", "hn");
const output = path.join(root, "reader", "generated", "hn-editions.ts");
const editions = [];
for (const entry of (await readdir(runsRoot, { withFileTypes: true })).filter((item) => item.isDirectory()).sort((a, b) => b.name.localeCompare(a.name))) { if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.name)) continue; const dayDir = path.join(runsRoot, entry.name); const status = JSON.parse(await readFile(path.join(dayDir, "publisher-status.json"), "utf8").catch(() => "{}")); if (status.state !== "complete") continue; const files = (await readdir(dayDir)).filter((name) => /^edition-v\d+\.json$/.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })); for (const filename of files) { const raw = await readFile(path.join(dayDir, filename), "utf8"); editions.push({ ...JSON.parse(raw), hash: createHash("sha256").update(raw).digest("hex").slice(0, 12), current: filename === status.current }); } }
if (!editions.length) throw new Error("No completed HN editions found in runs/hn/");
const source = `// Generated; do not edit.\nexport type HnPulse = { text: string; by?: string; url?: string };\nexport type HnStory = { rank: number; id: number; title: string; url: string; discussionUrl: string; source: string; points: number; comments: number; timestamp: string; summary: string; badges: string[]; pulse: HnPulse[] };\nexport type HnDive = { storyId: number; title: string; why: string; agreement: string; disagreement: string; signal: string; projectLinks?: string[]; comments: HnPulse[] };\nexport type HnEdition = { contentType: "hn"; date: string; version: string; fetchedAt: string; current: boolean; hash: string; stories: HnStory[]; dives: HnDive[] };\nexport const hnEditions: HnEdition[] = ${JSON.stringify(editions, null, 2)};\nexport const newestHnEdition = hnEditions[0];\n`;
await mkdir(path.dirname(output), { recursive: true }); await writeFile(output, source); console.log(`Published ${editions.length} HN editions`);
