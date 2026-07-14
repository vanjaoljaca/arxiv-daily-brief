declare global {
  interface Env {
    DB: D1Database;
    AUDIO: R2Bucket;
    SITES_INGESTION_SECRET?: string;
  }
}

export {};
