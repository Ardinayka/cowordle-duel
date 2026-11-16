CREATE TABLE `room_members` (
	`code` text NOT NULL,
	`user_id` text NOT NULL,
	`seat` integer NOT NULL,
	`other_name` text NOT NULL,
	`mode` text NOT NULL,
	`status` text NOT NULL,
	`my_turn` integer DEFAULT 0 NOT NULL,
	`result` text,
	`updated` integer NOT NULL,
	PRIMARY KEY(`code`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_room_members_user` ON `room_members` (`user_id`,`status`,`updated`);