CREATE TABLE `action_history` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`rule_id` text,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target_level` text,
	`target_id` text,
	`target_name` text,
	`detail` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_action_history_ws` ON `action_history` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `automation_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`level` text NOT NULL,
	`metric` text NOT NULL,
	`operator` text NOT NULL,
	`value` real NOT NULL,
	`window_days` integer NOT NULL,
	`min_spend` real NOT NULL,
	`action` text NOT NULL,
	`active` integer NOT NULL,
	`cooldown_hours` integer NOT NULL,
	`last_triggered_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `email_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_verifications_token_hash_unique` ON `email_verifications` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_email_verifications_user` ON `email_verifications` (`user_id`);--> statement-breakpoint
CREATE TABLE `google_oauth_states` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`state_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_google_oauth_states_hash` ON `google_oauth_states` (`state_hash`);--> statement-breakpoint
CREATE INDEX `idx_google_oauth_states_user` ON `google_oauth_states` (`user_id`);--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`ip` text,
	`success` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_login_attempts_email_time` ON `login_attempts` (`email`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_login_attempts_ip_time` ON `login_attempts` (`ip`,`created_at`);--> statement-breakpoint
CREATE TABLE `meta_linked` (
	`user_id` text NOT NULL,
	`ad_account_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_meta_linked_user_ad` ON `meta_linked` (`user_id`,`ad_account_id`);--> statement-breakpoint
CREATE TABLE `notification_prefs` (
	`workspace_id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`prefs` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `password_resets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_resets_token_hash_unique` ON `password_resets` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_password_resets_user` ON `password_resets` (`user_id`);--> statement-breakpoint
CREATE TABLE `plan_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`email` text,
	`plan` text NOT NULL,
	`status` text NOT NULL,
	`cakto_order_id` text,
	`cakto_subscription_id` text,
	`cakto_offer_id` text,
	`amount` text,
	`currency` text,
	`current_period_end` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_plan_subs_workspace` ON `plan_subscriptions` (`workspace_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_plan_subs_cakto_sub` ON `plan_subscriptions` (`cakto_subscription_id`);--> statement-breakpoint
CREATE INDEX `idx_plan_subs_email` ON `plan_subscriptions` (`email`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`workspace_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_push_sub_endpoint` ON `push_subscriptions` (`workspace_id`,`endpoint`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`is_admin` integer DEFAULT 0 NOT NULL,
	`pending_2fa` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`ip` text,
	`user_agent` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_expires` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text,
	`cpf` text,
	`created_at` integer NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`totp_secret_cipher` text,
	`totp_iv` text,
	`totp_enabled` integer DEFAULT 0 NOT NULL,
	`email_verified_at` integer,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_cpf_unique` ON `users` (`cpf`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_api_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`provider` text DEFAULT 'generic' NOT NULL,
	`token_hash` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`last_used_at` text
);
--> statement-breakpoint
INSERT INTO `__new_api_credentials`("id", "workspace_id", "project_id", "name", "provider", "token_hash", "active", "created_at", "last_used_at") SELECT "id", "workspace_id", "project_id", "name", "provider", "token_hash", "active", "created_at", "last_used_at" FROM `api_credentials`;--> statement-breakpoint
DROP TABLE `api_credentials`;--> statement-breakpoint
ALTER TABLE `__new_api_credentials` RENAME TO `api_credentials`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_api_credentials_token` ON `api_credentials` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_api_credentials_workspace` ON `api_credentials` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `idx_api_credentials_project` ON `api_credentials` (`project_id`);--> statement-breakpoint
CREATE TABLE `__new_meta_accounts` (
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
	`selected` integer DEFAULT 0 NOT NULL,
	`connected_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_meta_accounts`("id", "workspace_id", "user_id", "meta_user_id", "meta_user_name", "ad_account_id", "account_name", "currency", "timezone_name", "account_status", "access_token_cipher", "access_token_iv", "token_expires_at", "selected", "connected_at", "updated_at") SELECT "id", "workspace_id", "user_id", "meta_user_id", "meta_user_name", "ad_account_id", "account_name", "currency", "timezone_name", "account_status", "access_token_cipher", "access_token_iv", "token_expires_at", "selected", "connected_at", "updated_at" FROM `meta_accounts`;--> statement-breakpoint
DROP TABLE `meta_accounts`;--> statement-breakpoint
ALTER TABLE `__new_meta_accounts` RENAME TO `meta_accounts`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_meta_accounts_user_ad` ON `meta_accounts` (`user_id`,`ad_account_id`);--> statement-breakpoint
CREATE INDEX `idx_meta_accounts_workspace` ON `meta_accounts` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `idx_meta_accounts_selected` ON `meta_accounts` (`user_id`,`selected`);--> statement-breakpoint
ALTER TABLE `orders` ADD `utm_campaign` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `utm_source` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `utm_medium` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `utm_content` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `utm_term` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `tracking_config` text;