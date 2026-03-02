import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// 贷款申请表
export const loanApplications = mysqlTable("loan_applications", {
  id: int("id").autoincrement().primaryKey(),
  applicantId: int("applicantId").notNull(),
  applicantName: varchar("applicantName", { length: 128 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  purpose: varchar("purpose", { length: 512 }).notNull(),
  loanType: mysqlEnum("loanType", [
    "personal",
    "business",
    "mortgage",
    "education",
    "emergency",
  ]).notNull(),
  termMonths: int("termMonths").notNull(),
  interestRate: decimal("interestRate", { precision: 5, scale: 2 }),
  status: mysqlEnum("status", [
    "draft",
    "pending",
    "under_review",
    "approved",
    "rejected",
    "disbursed",
    "repaying",
    "completed",
    "overdue",
  ])
    .default("pending")
    .notNull(),
  collateral: text("collateral"),
  monthlyIncome: decimal("monthlyIncome", { precision: 15, scale: 2 }),
  employmentStatus: varchar("employmentStatus", { length: 64 }),
  notes: text("notes"),
  attachmentUrls: text("attachmentUrls"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LoanApplication = typeof loanApplications.$inferSelect;
export type InsertLoanApplication = typeof loanApplications.$inferInsert;

// 审批记录表
export const loanApprovals = mysqlTable("loan_approvals", {
  id: int("id").autoincrement().primaryKey(),
  loanId: int("loanId").notNull(),
  reviewerId: int("reviewerId").notNull(),
  reviewerName: varchar("reviewerName", { length: 128 }).notNull(),
  action: mysqlEnum("action", [
    "submit",
    "approve",
    "reject",
    "request_info",
    "disburse",
  ]).notNull(),
  comment: text("comment"),
  previousStatus: varchar("previousStatus", { length: 32 }),
  newStatus: varchar("newStatus", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LoanApproval = typeof loanApprovals.$inferSelect;
export type InsertLoanApproval = typeof loanApprovals.$inferInsert;

// 还款记录表
export const loanRepayments = mysqlTable("loan_repayments", {
  id: int("id").autoincrement().primaryKey(),
  loanId: int("loanId").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentDate: timestamp("paymentDate").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 64 }),
  status: mysqlEnum("status", ["pending", "completed", "failed"]).default("completed").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LoanRepayment = typeof loanRepayments.$inferSelect;
export type InsertLoanRepayment = typeof loanRepayments.$inferInsert;

// 系统通知表
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  content: text("content").notNull(),
  type: mysqlEnum("type", ["info", "success", "warning", "error"]).default("info").notNull(),
  isRead: int("isRead").default(0).notNull(),
  relatedLoanId: int("relatedLoanId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// AI视频任务表
export const aiVideoTasks = mysqlTable("ai_video_tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  taskId: varchar("taskId", { length: 128 }),
  prompt: text("prompt").notNull(),
  imageUrl: text("imageUrl"),
  videoUrl: text("videoUrl"),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"])
    .default("pending")
    .notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiVideoTask = typeof aiVideoTasks.$inferSelect;
export type InsertAiVideoTask = typeof aiVideoTasks.$inferInsert;