#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const date = process.argv.find((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));
if (!date) throw new Error("Usage: assemble-hn-edition.mjs YYYY-MM-DD [vN]");
const version = process.argv.find((value) => /^v\d+$/.test(value)) ?? "v1";
const runDir = path.join(root, "runs", "hn", date);
const draft = JSON.parse(await readFile(path.join(runDir, "draft.json"), "utf8"));
const editorial = JSON.parse(await readFile(path.join(runDir, `editorial-${version}.json`), "utf8"));
const candidates = new Map(draft.ranked.map((story) => [story.id, story]));
const pulseItem = (story, item) => { const source = story.commentCandidates.find((comment) => comment.id === item.commentId); return { text: item.text, ...(source ? { by: source.by, url: source.url } : {}) }; };
const stories = editorial.stories.map((item, index) => { const source = candidates.get(item.id); if (!source) throw new Error(`Missing HN item ${item.id}`); if (item.pulse.length < 3 || item.pulse.length > 4) throw new Error(`HN item ${item.id} needs 3–4 pulse items`); return { rank: index + 1, id: source.id, title: source.title, url: source.url, discussionUrl: source.discussionUrl, source: source.source, points: source.points, comments: source.comments, timestamp: source.timestamp, summary: item.summary, badges: item.badges || source.badges, pulse: item.pulse.map((pulse) => pulseItem(source, pulse)) }; });
const storyMap = new Map(stories.map((story) => [story.id, story]));
const dives = editorial.dives.map((dive) => { const story = storyMap.get(dive.storyId); if (!story) throw new Error(`Dive ${dive.storyId} is not in headlines`); const source = candidates.get(dive.storyId); return { ...dive, title: story.title, comments: dive.comments.map((item) => pulseItem(source, item)) }; });
await writeFile(path.join(runDir, `edition-${version}.json`), JSON.stringify({ contentType: "hn", date, version, fetchedAt: draft.fetchedAt, stories, dives }, null, 2) + "\n");
console.log(`Assembled HN ${date} ${version}: ${stories.length} headlines, ${dives.length} dives`);
