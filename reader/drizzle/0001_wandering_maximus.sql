ALTER TABLE `voice_sessions` ADD `content_type` text DEFAULT 'arxiv' NOT NULL;--> statement-breakpoint
DROP INDEX IF EXISTS `voice_sessions_edition_idx`;--> statement-breakpoint
CREATE INDEX `voice_sessions_edition_idx` ON `voice_sessions` (`owner_email`,`content_type`,`delivery_date`,`edition_version`,`started_at`);
