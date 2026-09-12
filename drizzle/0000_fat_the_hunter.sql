CREATE TABLE `cafes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cafes_slug_unique` ON `cafes` (`slug`);--> statement-breakpoint
CREATE INDEX `cafes_owner_idx` ON `cafes` (`owner`);--> statement-breakpoint
CREATE TABLE `rates` (
	`key` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `visits` (
	`cafe` text NOT NULL,
	`day` text NOT NULL,
	`visitor` text NOT NULL,
	`hour` integer NOT NULL,
	PRIMARY KEY(`cafe`, `day`, `visitor`),
	FOREIGN KEY (`cafe`) REFERENCES `cafes`(`id`) ON UPDATE no action ON DELETE cascade
);
