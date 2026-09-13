CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`source` text NOT NULL,
	`notes` text NOT NULL,
	`script` text DEFAULT '' NOT NULL,
	`scenes` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'collected' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`board` text,
	`lock` text,
	`lock_at` integer,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `projects_owner_updated` ON `projects` (`owner`,`updated`);