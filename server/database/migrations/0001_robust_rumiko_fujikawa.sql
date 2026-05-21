ALTER TABLE `sessions` ADD `name` text DEFAULT '新会话' NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` DROP COLUMN `title`;