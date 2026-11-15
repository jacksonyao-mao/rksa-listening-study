CREATE TABLE `submissions` (
	`study` text NOT NULL,
	`participant` text NOT NULL,
	`receipt` text NOT NULL,
	`submitted` text NOT NULL,
	`ratings` text NOT NULL,
	PRIMARY KEY(`study`, `participant`)
);
