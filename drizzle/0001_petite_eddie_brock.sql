CREATE TABLE `ai_video_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taskId` varchar(128),
	`prompt` text NOT NULL,
	`imageUrl` text,
	`videoUrl` text,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_video_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loan_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicantId` int NOT NULL,
	`applicantName` varchar(128) NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`purpose` varchar(512) NOT NULL,
	`loanType` enum('personal','business','mortgage','education','emergency') NOT NULL,
	`termMonths` int NOT NULL,
	`interestRate` decimal(5,2),
	`status` enum('draft','pending','under_review','approved','rejected','disbursed','repaying','completed','overdue') NOT NULL DEFAULT 'pending',
	`collateral` text,
	`monthlyIncome` decimal(15,2),
	`employmentStatus` varchar(64),
	`notes` text,
	`attachmentUrls` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loan_applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loan_approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`loanId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`reviewerName` varchar(128) NOT NULL,
	`action` enum('submit','approve','reject','request_info','disburse') NOT NULL,
	`comment` text,
	`previousStatus` varchar(32),
	`newStatus` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loan_approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loan_repayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`loanId` int NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`paymentDate` timestamp NOT NULL,
	`paymentMethod` varchar(64),
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'completed',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loan_repayments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`content` text NOT NULL,
	`type` enum('info','success','warning','error') NOT NULL DEFAULT 'info',
	`isRead` int NOT NULL DEFAULT 0,
	`relatedLoanId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
