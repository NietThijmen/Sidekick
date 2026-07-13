CREATE TABLE `agent` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`system_prompt` text DEFAULT '' NOT NULL,
	`model` text DEFAULT 'openai/gpt-5.6-luna' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `agent_userId_idx` ON `agent` (`user_id`);--> statement-breakpoint
ALTER TABLE `chat` ADD `agent_id` text REFERENCES agent(id);
