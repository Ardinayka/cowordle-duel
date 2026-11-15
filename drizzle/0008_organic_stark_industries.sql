ALTER TABLE `friend_profiles` ADD `username` text;--> statement-breakpoint
CREATE UNIQUE INDEX `friend_profiles_username_unique` ON `friend_profiles` (`username`);