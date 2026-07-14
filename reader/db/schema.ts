import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const voiceSessions = sqliteTable("voice_sessions", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  contentType: text("content_type", { enum: ["arxiv", "hn"] }).notNull().default("arxiv"),
  deliveryDate: text("delivery_date").notNull(),
  editionVersion: text("edition_version").notNull(),
  mimeType: text("mime_type").notNull(),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  durationMs: integer("duration_ms").notNull().default(0),
  totalChunks: integer("total_chunks").notNull().default(0),
  totalBytes: integer("total_bytes").notNull().default(0),
  status: text("status", { enum: ["recording", "waiting", "ingested"] }).notNull().default("recording"),
  ingestedAt: text("ingested_at"),
}, (table) => [
  index("voice_sessions_queue_idx").on(table.status, table.finishedAt),
  index("voice_sessions_edition_idx").on(table.ownerEmail, table.contentType, table.deliveryDate, table.editionVersion, table.startedAt),
]);

export const voiceChunks = sqliteTable("voice_chunks", {
  sessionId: text("session_id").notNull().references(() => voiceSessions.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  r2Key: text("r2_key").notNull(),
  bytes: integer("bytes").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [primaryKey({ columns: [table.sessionId, table.chunkIndex] })]);
