#!/usr/bin/env node

import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectPublisher = path.resolve(siteRoot, "..", "scripts", "publish-reader-content.mjs");

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
