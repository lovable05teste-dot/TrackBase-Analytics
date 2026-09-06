CREATE TABLE `api_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`provider` text DEFAULT 'generic' NOT NULL,
	`token_hash` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`last_used_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_api_credentials_token` ON `api_credentials` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_api_credentials_workspace` ON `api_credentials` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `idx_api_credentials_project` ON `api_credentials` (`project_id`);