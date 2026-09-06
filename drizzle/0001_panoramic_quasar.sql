ALTER TABLE `projects` ADD `public_key` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `webhook_secret_hash` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `meta_token_cipher` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `meta_token_iv` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `meta_test_code` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `meta_connected_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_projects_public_key` ON `projects` (`public_key`);