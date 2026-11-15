CREATE TABLE `match_results` (
	`id` text PRIMARY KEY NOT NULL,
	`room_code` text NOT NULL,
	`match` integer NOT NULL,
	`mode` text NOT NULL,
	`player_a` text,
	`player_b` text,
	`winner` text,
	`reason` text NOT NULL,
	`rated` integer DEFAULT 0 NOT NULL,
	`settled` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_match_results_players` ON `match_results` (`player_a`,`player_b`);--> statement-breakpoint
CREATE INDEX `idx_match_results_created` ON `match_results` (`created`);--> statement-breakpoint
CREATE TABLE `player_ratings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`rating` integer DEFAULT 1000 NOT NULL,
	`rated_games` integer DEFAULT 0 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`draws` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_player_ratings_rank` ON `player_ratings` (`rating`,`rated_games`);--> statement-breakpoint
CREATE TABLE `rating_events` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`user_id` text NOT NULL,
	`rating_before` integer NOT NULL,
	`delta` integer NOT NULL,
	`rating_after` integer NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_rating_events_user` ON `rating_events` (`user_id`,`created`);