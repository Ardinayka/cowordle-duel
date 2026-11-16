CREATE TABLE `queue_penalties` (
	`user_id` text PRIMARY KEY NOT NULL,
	`strikes` integer DEFAULT 0 NOT NULL,
	`last_strike` integer DEFAULT 0 NOT NULL,
	`until` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`starts` integer NOT NULL,
	`ends` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `match_queue` ADD `queue` text;--> statement-breakpoint
ALTER TABLE `match_queue` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `match_queue` ADD `rating` integer;--> statement-breakpoint
ALTER TABLE `match_results` ADD `queue` text;--> statement-breakpoint
ALTER TABLE `match_results` ADD `season` integer;--> statement-breakpoint
ALTER TABLE `match_results` ADD `score_a` integer;--> statement-breakpoint
ALTER TABLE `match_results` ADD `score_b` integer;--> statement-breakpoint
ALTER TABLE `match_results` ADD `end_type` text;--> statement-breakpoint
ALTER TABLE `player_ratings` ADD `peak_rating` integer;--> statement-breakpoint
ALTER TABLE `player_ratings` ADD `tier` text;--> statement-breakpoint
ALTER TABLE `player_ratings` ADD `season` integer;--> statement-breakpoint
ALTER TABLE `player_ratings` ADD `season_games` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `rating_events` ADD `tier_before` text;--> statement-breakpoint
ALTER TABLE `rating_events` ADD `tier_after` text;--> statement-breakpoint
INSERT OR IGNORE INTO `seasons` (`id`,`name`,`starts`,`ends`) VALUES (1,'Season 1',CAST(strftime('%s','now') AS INTEGER)*1000,CAST(strftime('%s','now','+91 days') AS INTEGER)*1000);
