CREATE TABLE `sound_prefs` (
	`workspace_id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`prefs` text NOT NULL,
	`updated_at` integer NOT NULL
);
