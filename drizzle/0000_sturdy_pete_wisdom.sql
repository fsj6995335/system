CREATE TABLE `ai_video_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256),
	`taskId` varchar(128),
	`prompt` text NOT NULL,
	`imageUrl` text,
	`avatarUrl` text,
	`voiceUrl` text,
	`videoUrl` text,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_video_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bank_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bankName` varchar(128) NOT NULL,
	`productName` varchar(256) NOT NULL,
	`productType` enum('mortgage','business','personal','credit_card','car_loan') NOT NULL,
	`minAmount` decimal(15,2),
	`maxAmount` decimal(15,2),
	`interestRateMin` decimal(5,2),
	`interestRateMax` decimal(5,2),
	`termMin` int,
	`termMax` int,
	`requirements` text,
	`minCreditScore` int,
	`features` text,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bank_products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`address` text,
	`phone` varchar(20),
	`managerId` int,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credit_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uploaderId` int NOT NULL,
	`uploaderName` varchar(128),
	`customerName` varchar(128) NOT NULL,
	`customerPhone` varchar(20),
	`customerIdCard` varchar(20),
	`creditScore` int,
	`customerGrade` enum('A','B','C','D') NOT NULL DEFAULT 'C',
	`reportFileUrl` text,
	`monthlyIncome` decimal(15,2),
	`totalDebt` decimal(15,2),
	`hasOverdue` int NOT NULL DEFAULT 0,
	`notes` text,
	`status` enum('pending','reviewed','matched','rejected') NOT NULL DEFAULT 'pending',
	`branchId` int,
	`teamId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credit_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`branchId` int,
	`teamId` int,
	`newCreditReports` int NOT NULL DEFAULT 0,
	`newCustomersA` int NOT NULL DEFAULT 0,
	`newCustomersB` int NOT NULL DEFAULT 0,
	`newCustomersC` int NOT NULL DEFAULT 0,
	`newDisbursements` int NOT NULL DEFAULT 0,
	`disbursementAmount` decimal(15,2) NOT NULL DEFAULT '0',
	`commissionAmount` decimal(15,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_stats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `disbursements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creditReportId` int,
	`bankProductId` int,
	`customerName` varchar(128) NOT NULL,
	`bankName` varchar(128),
	`amount` decimal(15,2) NOT NULL,
	`commission` decimal(15,2),
	`employeeId` int NOT NULL,
	`employeeName` varchar(128),
	`branchId` int,
	`teamId` int,
	`status` enum('pending','approved','disbursed','completed','cancelled') NOT NULL DEFAULT 'pending',
	`disbursedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `disbursements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `match_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creditReportId` int NOT NULL,
	`bankProductId` int NOT NULL,
	`matchScore` int,
	`matchedBy` int,
	`status` enum('pending','accepted','rejected','applied') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `match_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`content` text NOT NULL,
	`type` enum('info','success','warning','error') NOT NULL DEFAULT 'info',
	`isRead` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operation_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(128),
	`action` varchar(64) NOT NULL,
	`module` varchar(64) NOT NULL,
	`detail` text,
	`ip` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operation_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`branchId` int NOT NULL,
	`leaderId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`phone` varchar(20),
	`avatarUrl` text,
	`role` enum('user','admin','boss','director','shareholder','leader','finance','employee') NOT NULL DEFAULT 'employee',
	`branchId` int,
	`teamId` int,
	`simulatedRole` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
