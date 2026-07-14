#!/usr/bin/env node

import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectPublisher = path.resolve(siteRoot, "..", "scripts", "publish-reader-content.mjs");
const projectRoot = path.resolve(siteRoot, "..");
const hnPublisher = path.join(projectRoot, "scripts", "publish-hn-content.mjs");
const hnRuns = path.join(projectRoot, "runs", "hn");

try {
  await access(projectPublisher);
  await import(pathToFileURL(projectPublisher).href);
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
    console.log("Using the saved edition catalogue (project runs/ is not present in this hosted source checkout). ");
  } else {
    throw error;
  }
}

try {
  await access(hnPublisher);
  await access(hnRuns);
  await import(pathToFileURL(hnPublisher).href);
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") console.log("Using the saved HN catalogue.");
  else throw error;
}
