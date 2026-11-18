CREATE TABLE `email_codes` (
	`email_hash` text PRIMARY KEY NOT NULL,
	`code_hash` text NOT NULL,
	`expires` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_email_codes_expiry` ON `email_codes` (`expires`);--> statement-breakpoint
ALTER TABLE `friend_profiles` ADD `badge` text;