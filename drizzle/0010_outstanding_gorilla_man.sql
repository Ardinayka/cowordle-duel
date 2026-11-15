CREATE TABLE `player_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`blocked` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_player_blocks_owner` ON `player_blocks` (`owner`);--> statement-breakpoint
CREATE INDEX `idx_player_blocks_peer` ON `player_blocks` (`blocked`);--> statement-breakpoint
CREATE TABLE `room_presence` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`seat` text NOT NULL,
	`seen_at` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_room_presence_code` ON `room_presence` (`code`);--> statement-breakpoint
CREATE INDEX `idx_room_presence_expires` ON `room_presence` (`expires`);--> statement-breakpoint
CREATE TABLE `support_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`message` text NOT NULL,
	`email` text,
	`reporter` text,
	`player_tag` text,
	`room` text,
	`created` integer NOT NULL,
	`expires` integer NOT NULL,
	`status` text DEFAULT 'new' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_support_reports_expiry` ON `support_reports` (`expires`);--> statement-breakpoint
CREATE INDEX `idx_support_reports_status` ON `support_reports` (`status`,`created`);--> statement-breakpoint
ALTER TABLE `friend_profiles` ADD `avatar` text DEFAULT 'fox' NOT NULL;--> statement-breakpoint
ALTER TABLE `friend_profiles` ADD `colour` text DEFAULT '#51d4ff' NOT NULL;