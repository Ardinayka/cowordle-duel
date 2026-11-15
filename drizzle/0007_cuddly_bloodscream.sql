CREATE TABLE `friend_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`sender` text NOT NULL,
	`recipient` text NOT NULL,
	`code` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_friend_challenges_recipient` ON `friend_challenges` (`recipient`);--> statement-breakpoint
CREATE INDEX `idx_friend_challenges_expires` ON `friend_challenges` (`expires`);--> statement-breakpoint
CREATE TABLE `friend_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`tag` text NOT NULL,
	`seen_at` integer DEFAULT 0 NOT NULL,
	`available` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `friend_profiles_tag_unique` ON `friend_profiles` (`tag`);--> statement-breakpoint
CREATE TABLE `friendships` (
	`id` text PRIMARY KEY NOT NULL,
	`a` text NOT NULL,
	`b` text NOT NULL,
	`sender` text NOT NULL,
	`status` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_friendships_a` ON `friendships` (`a`);--> statement-breakpoint
CREATE INDEX `idx_friendships_b` ON `friendships` (`b`);