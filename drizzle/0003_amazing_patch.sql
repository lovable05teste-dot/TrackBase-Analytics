CREATE TABLE `meta_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`meta_user_id` text,
	`meta_user_name` text,
	`ad_account_id` text NOT NULL,
	`account_name` text NOT NULL,
	`currency` text,
	`timezone_name` text,
	`account_status` integer,
	`access_token_cipher` text NOT NULL,
	`access_token_iv` text NOT NULL,
	`token_expires_at` integer,
	`selected` integer DEFAULT false NOT NULL,
	`connected_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_meta_accounts_user_ad` ON `meta_accounts` (`user_id`,`ad_account_id`);--> statement-breakpoint
CREATE INDEX `idx_meta_accounts_workspace` ON `meta_accounts` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `idx_meta_accounts_selected` ON `meta_accounts` (`user_id`,`selected`);--> statement-breakpoint
CREATE TABLE `meta_oauth_states` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`state_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_meta_oauth_states_hash` ON `meta_oauth_states` (`state_hash`);--> statement-breakpoint
CREATE INDEX `idx_meta_oauth_states_user` ON `meta_oauth_states` (`user_id`);