#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const date = process.argv.find((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));
if (!date) throw new Error("Usage: prepare-hn-edition.mjs YYYY-MM-DD");
const runDir = path.join(root, "runs", "hn", date);
const raw = JSON.parse(await readFile(path.join(runDir, "raw", "items.json"), "utf8"));
const signals = [[8, /speech|voice|audio|transcri/i, "Voice"], [7, /programming language|compiler|runtime|\brust\b|\bpython\b|\bsql\b/i, "PL"], [7, /developer|\bgit\b|xcode|debug|tool|skill/i, "Tools"], [6, /cloud|infra|kubernetes|linux|database|distributed|security|kernel/i, "Cloud"], [6, /\bai\b|llm|agent|model|neural|copilot|claude/i, "AI"], [5, /education|learning|ux|hci|interface|scroll/i, "UX"]];
const clean = (text = "") => text.replace(/<p>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&#x2F;/g, "/").replace(/\s+/g, " ").trim();
const comments = new Map(raw.comments.map((item) => [item.id, item]));
const ranked = raw.stories.map((story, sourceRank) => { const matched = signals.filter(([, pattern]) => pattern.test(story.title)); const relevance = matched.reduce((sum, [weight]) => sum + weight, 0); return { id: story.id, sourceRank, rankScore: Number((relevance + Math.min(9, Math.log2((story.descendants || 0) + 1)) + Math.min(8, Math.log2((story.score || 0) + 1)) - sourceRank * .08).toFixed(2)), badges: [...new Set(matched.map(([, , label]) => label))].slice(0, 2), title: story.title, url: story.url || `https://news.ycombinator.com/item?id=${story.id}`, discussionUrl: `https://news.ycombinator.com/item?id=${story.id}`, source: story.url ? new URL(story.url).hostname.replace(/^www\./, "") : "news.ycombinator.com", points: story.score || 0, comments: story.descendants || 0, timestamp: new Date(story.time * 1000).toISOString(), by: story.by, commentCandidates: (story.kids || []).slice(0, 8).map((id) => comments.get(id)).filter(Boolean).map((comment) => ({ id: comment.id, by: comment.by, text: clean(comment.text).slice(0, 900), url: `https://news.ycombinator.com/item?id=${comment.id}` })) }; }).sort((a, b) => b.rankScore - a.rankScore);
await writeFile(path.join(runDir, "draft.json"), JSON.stringify({ contentType: "hn", date, version: "v1", fetchedAt: raw.fetchedAt, source: { name: "Official Hacker News Firebase API", url: "https://github.com/HackerNews/API" }, ranked }, null, 2) + "\n");
console.log(`Prepared ${ranked.length} ranked HN candidates for ${date}`);
