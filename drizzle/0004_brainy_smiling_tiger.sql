CREATE TABLE `retired_searches` (
	`id` text PRIMARY KEY NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_retired_searches_expires` ON `retired_searches` (`expires`);