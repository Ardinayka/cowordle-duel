CREATE TABLE `match_queue` (
	`auth` text PRIMARY KEY NOT NULL,
	`search_id` text NOT NULL,
	`bucket` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`created` integer NOT NULL,
	`lease_until` integer NOT NULL,
	`room_code` text
);
--> statement-breakpoint
CREATE INDEX `idx_match_queue_waiting` ON `match_queue` (`bucket`,`status`,`lease_until`,`created`);