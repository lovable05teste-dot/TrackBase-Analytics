CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`event_id` text NOT NULL,
	`event_name` text NOT NULL,
	`source` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`visitor_id` text,
	`fbclid` text,
	`fbp` text,
	`fbc` text,
	`utm_source` text,
	`utm_campaign` text,
	`utm_medium` text,
	`utm_content` text,
	`utm_term` text,
	`value` real,
	`currency` text,
	`payload` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_events_project_event` ON `events` (`project_id`,`event_id`);--> statement-breakpoint
CREATE INDEX `idx_events_project_time` ON `events` (`project_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_events_project_name_time` ON `events` (`project_id`,`event_name`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`email` text,
	`role` text DEFAULT 'member' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_members_workspace_user` ON `members` (`workspace_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`external_id` text NOT NULL,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`value` real NOT NULL,
	`currency` text NOT NULL,
	`event_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_orders_provider_external` ON `orders` (`provider`,`external_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_project_time` ON `orders` (`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`domain` text,
	`pixel_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_projects_workspace` ON `projects` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
