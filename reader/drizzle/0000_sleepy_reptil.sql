CREATE TABLE `voice_chunks` (
	`session_id` text NOT NULL,
	`chunk_index` integer NOT NULL,
	`r2_key` text NOT NULL,
	`bytes` integer NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`session_id`, `chunk_index`),
	FOREIGN KEY (`session_id`) REFERENCES `voice_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `voice_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`delivery_date` text NOT NULL,
	`edition_version` text NOT NULL,
	`mime_type` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`total_chunks` integer DEFAULT 0 NOT NULL,
	`total_bytes` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'recording' NOT NULL,
	`ingested_at` text
);
--> statement-breakpoint
CREATE INDEX `voice_sessions_queue_idx` ON `voice_sessions` (`status`,`finished_at`);
--> statement-breakpoint
CREATE INDEX `voice_sessions_edition_idx` ON `voice_sessions` (`owner_email`,`delivery_date`,`edition_version`,`started_at`);
