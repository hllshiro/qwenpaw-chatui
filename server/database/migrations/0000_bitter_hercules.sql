CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`business_key` text DEFAULT 'default' NOT NULL,
	`title` text DEFAULT '新会话' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
