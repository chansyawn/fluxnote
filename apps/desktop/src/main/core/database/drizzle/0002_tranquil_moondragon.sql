ALTER TABLE `blocks` ADD `is_pinned` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `blocks` ADD `order_index` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `blocks`
SET `order_index` = (
  SELECT count(*) - 1
  FROM `blocks` AS `newer`
  WHERE `newer`.`created_at` > `blocks`.`created_at`
    OR (`newer`.`created_at` = `blocks`.`created_at` AND `newer`.`id` > `blocks`.`id`)
);--> statement-breakpoint
CREATE INDEX `idx_blocks_active_order` ON `blocks` (`archived_at`,`is_pinned`,`order_index`);
