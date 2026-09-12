CREATE TABLE `friend_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`sender_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`created` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `friend_requests_pair_unique` ON `friend_requests` (`sender_id`,`recipient_id`);--> statement-breakpoint
CREATE INDEX `friend_requests_recipient` ON `friend_requests` (`recipient_id`,`expires`);--> statement-breakpoint
CREATE TABLE `friendships` (
	`id` text PRIMARY KEY NOT NULL,
	`user_a` text NOT NULL,
	`user_b` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `friendships_pair_unique` ON `friendships` (`user_a`,`user_b`);--> statement-breakpoint
CREATE INDEX `friendships_user_a` ON `friendships` (`user_a`);--> statement-breakpoint
CREATE INDEX `friendships_user_b` ON `friendships` (`user_b`);--> statement-breakpoint
CREATE TABLE `game_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`sender_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`room_code` text NOT NULL,
	`mode` text NOT NULL,
	`created` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `game_challenges_recipient` ON `game_challenges` (`recipient_id`,`expires`);--> statement-breakpoint
CREATE TABLE `player_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`username` text,
	`username_key` text,
	`player_tag` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `player_profiles_username_key_unique` ON `player_profiles` (`username_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `player_profiles_player_tag_unique` ON `player_profiles` (`player_tag`);