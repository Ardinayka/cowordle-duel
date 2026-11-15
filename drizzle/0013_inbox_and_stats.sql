CREATE TABLE `daily_stats` (
	`day` text NOT NULL,
	`metric` text NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`day`, `metric`)
);
--> statement-breakpoint
CREATE TABLE `player_days` (
	`day` text NOT NULL,
	`player` text NOT NULL,
	PRIMARY KEY(`day`, `player`)
);
--> statement-breakpoint
CREATE INDEX `idx_player_days_player` ON `player_days` (`player`,`day`);--> statement-breakpoint
ALTER TABLE `friend_challenges` ADD `status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `friend_challenges` ADD `created` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `friend_challenges` ADD `seen_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `friend_challenges` ADD `responded_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `friend_challenges` ADD `mode` text;--> statement-breakpoint
ALTER TABLE `friend_challenges` ADD `seconds` integer;--> statement-breakpoint
CREATE INDEX `idx_friend_challenges_sender` ON `friend_challenges` (`sender`,`created`);