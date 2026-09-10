CREATE TABLE `auth_challenges` (
	`hash` text PRIMARY KEY NOT NULL,
	`nonce` text NOT NULL,
	`csrf` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_auth_challenges_expiry` ON `auth_challenges` (`expires`);--> statement-breakpoint
CREATE TABLE `auth_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`google_sub` text NOT NULL,
	`display_name` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_profiles_google_sub_unique` ON `auth_profiles` (`google_sub`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`csrf` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_auth_sessions_expiry` ON `auth_sessions` (`expires`);--> statement-breakpoint
CREATE INDEX `idx_auth_sessions_user` ON `auth_sessions` (`user_id`);