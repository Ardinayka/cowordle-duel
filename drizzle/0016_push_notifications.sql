CREATE TABLE `push_config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`endpoint` text PRIMARY KEY NOT NULL,
	`player` text NOT NULL,
	`user_id` text,
	`invites` integer DEFAULT 0 NOT NULL,
	`reminders` integer DEFAULT 0 NOT NULL,
	`time_zone` text DEFAULT 'UTC' NOT NULL,
	`pending` text,
	`reminded_day` text,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_push_subscriptions_user` ON `push_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_push_subscriptions_reminders` ON `push_subscriptions` (`reminders`,`updated`);