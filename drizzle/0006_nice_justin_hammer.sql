CREATE TABLE `verification_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`purpose` text NOT NULL,
	`code_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_verification_codes_email_purpose` ON `verification_codes` (`email`,`purpose`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_verification_codes_user` ON `verification_codes` (`user_id`);