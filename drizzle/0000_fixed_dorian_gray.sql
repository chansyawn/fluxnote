CREATE TABLE `block_tags` (
	`block_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`block_id`, `tag_id`),
	FOREIGN KEY (`block_id`) REFERENCES `blocks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_block_tags_tag_id` ON `block_tags` (`tag_id`);--> statement-breakpoint
CREATE INDEX `idx_block_tags_block_id` ON `block_tags` (`block_id`);--> statement-breakpoint
CREATE TABLE `blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`position` integer NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_blocks_archived_at` ON `blocks` (`archived_at`);--> statement-breakpoint
CREATE INDEX `idx_blocks_position` ON `blocks` (`position`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_tags_name_lower` ON `tags` (lower("name"));