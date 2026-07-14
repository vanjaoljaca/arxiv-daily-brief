#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const date = process.argv.find((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)) ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Perth", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const limit = Number(process.env.HN_STORY_LIMIT || 36);
const commentLimit = Number(process.env.HN_COMMENT_LIMIT || 18);
const api = "https://hacker-news.firebaseio.com/v0";
async function getJson(endpoint) { const response = await fetch(`${api}/${endpoint}.json`); if (!response.ok) throw new Error(`HN API ${response.status}: ${endpoint}`); return response.json(); }
async function batches(values, size, fn) { const output = []; for (let offset = 0; offset < values.length; offset += size) output.push(...await Promise.all(values.slice(offset, offset + size).map(fn))); return output; }

const fetchedAt = new Date().toISOString();
const ids = await getJson("topstories");
const stories = (await batches(ids.slice(0, Math.max(limit * 2, 72)), 16, (id) => getJson(`item/${id}`))).filter((item) => item?.type === "story" && !item.deleted && !item.dead).slice(0, limit);
const commentIds = [...new Set(stories.flatMap((story) => (story.kids || []).slice(0, commentLimit)))];
const comments = (await batches(commentIds, 24, (id) => getJson(`item/${id}`))).filter((item) => item?.type === "comment" && !item.deleted && !item.dead);
const runDir = path.join(root, "runs", "hn", date);
await mkdir(path.join(runDir, "raw"), { recursive: true });
await writeFile(path.join(runDir, "raw", "topstories.json"), JSON.stringify(ids, null, 2) + "\n");
await writeFile(path.join(runDir, "raw", "items.json"), JSON.stringify({ api, fetchedAt, stories, comments }, null, 2) + "\n");
await writeFile(path.join(runDir, "fetch.json"), JSON.stringify({ source: "official-hn-firebase-api", api, date, fetchedAt, storyCount: stories.length, commentCount: comments.length, topStoryIds: stories.map((story) => story.id) }, null, 2) + "\n");
console.log(`Fetched ${stories.length} HN stories and ${comments.length} comments for ${date}`);
