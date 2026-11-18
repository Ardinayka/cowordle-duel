CREATE TABLE `daily_devices` (
	`day` text NOT NULL,
	`device` text NOT NULL,
	`player` text NOT NULL,
	PRIMARY KEY(`day`, `device`)
);
--> statement-breakpoint
ALTER TABLE `daily_results` ADD `first_guess_at` integer;--> statement-breakpoint
ALTER TABLE `daily_results` ADD `eligible` integer DEFAULT 0 NOT NULL;