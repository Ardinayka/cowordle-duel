CREATE TABLE `daily_puzzles` (
	`day` text PRIMARY KEY NOT NULL,
	`word` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `daily_results` (
	`day` text NOT NULL,
	`player` text NOT NULL,
	`guesses` text NOT NULL,
	`solved` integer DEFAULT 0 NOT NULL,
	`tries` integer DEFAULT 0 NOT NULL,
	`finished` integer DEFAULT 0 NOT NULL,
	`updated` integer NOT NULL,
	PRIMARY KEY(`day`, `player`)
);
--> statement-breakpoint
CREATE INDEX `idx_daily_results_player` ON `daily_results` (`player`,`day`);--> statement-breakpoint
CREATE INDEX `idx_daily_results_day` ON `daily_results` (`day`,`finished`);--> statement-breakpoint
CREATE TABLE `player_progress` (
	`player` text PRIMARY KEY NOT NULL,
	`streak` integer DEFAULT 0 NOT NULL,
	`best` integer DEFAULT 0 NOT NULL,
	`freezes` integer DEFAULT 0 NOT NULL,
	`last_day` text,
	`played` integer DEFAULT 0 NOT NULL,
	`won` integer DEFAULT 0 NOT NULL,
	`dist` text DEFAULT '[0,0,0,0,0,0,0]' NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `player_ratings` ADD `season_tier` text;