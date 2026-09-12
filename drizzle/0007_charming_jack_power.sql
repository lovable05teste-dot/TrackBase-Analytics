CREATE TABLE `capi_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text NOT NULL,
	`pixel_id` text NOT NULL,
	`event_name` text NOT NULL,
	`event_id` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer NOT NULL,
	`last_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_capi_outbox_due` ON `capi_outbox` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `idx_capi_outbox_project` ON `capi_outbox` (`project_id`);