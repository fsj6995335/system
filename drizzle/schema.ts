import { bigint, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

// ============================================================
// 用户表 - 6角色RBAC权限体系
// ============================================================
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  phone: varchar("phone", { length: 20 }),
  avatarUrl: text("avatarUrl"),
  // 6角色: boss(老板), director(总监), shareholder(股东), leader(组长), finance(财务), employee(员工)
  role: mysqlEnum("role", ["user", "admin", "boss", "director", "shareholder", "leader", "finance", "employee"]).default("employee").notNull(),
  branchId: int("branchId"),
  teamId: int("teamId"),
  // 员工职位
  position: varchar("position", { length: 128 }),
  // 用于角色切换测试
  simulatedRole: varchar("simulatedRole", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================
// 分公司表
// ============================================================
export const branches = mysqlTable("branches", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  managerId: int("managerId"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Branch = typeof branches.$inferSelect;
export type InsertBranch = typeof branches.$inferInsert;

// ============================================================
// 团队表
// ============================================================
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  branchId: int("branchId").notNull(),
  leaderId: int("leaderId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

// ============================================================
// 征信报告表
// ============================================================
export const creditReports = mysqlTable("credit_reports", {
  id: int("id").autoincrement().primaryKey(),
  uploaderId: int("uploaderId").notNull(),
  uploaderName: varchar("uploaderName", { length: 128 }),
  customerName: varchar("customerName", { length: 128 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 20 }),
  customerIdCard: varchar("customerIdCard", { length: 20 }),
  creditScore: int("creditScore"),
  // A/B/C/D 客户分类
  customerGrade: mysqlEnum("customerGrade", ["A", "B", "C", "D"]).default("C").notNull(),
  reportFileUrl: text("reportFileUrl"),
  monthlyIncome: decimal("monthlyIncome", { precision: 15, scale: 2 }),
  totalDebt: decimal("totalDebt", { precision: 15, scale: 2 }),
  hasOverdue: int("hasOverdue").default(0).notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["pending", "reviewed", "matched", "rejected"]).default("pending").notNull(),
  branchId: int("branchId"),
  teamId: int("teamId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreditReport = typeof creditReports.$inferSelect;
export type InsertCreditReport = typeof creditReports.$inferInsert;

// ============================================================
// 银行产品表
// ============================================================
export const bankProducts = mysqlTable("bank_products", {
  id: int("id").autoincrement().primaryKey(),
  bankName: varchar("bankName", { length: 128 }).notNull(),
  productName: varchar("productName", { length: 256 }).notNull(),
  productType: mysqlEnum("productType", ["mortgage", "business", "personal", "credit_card", "car_loan"]).notNull(),
  minAmount: decimal("minAmount", { precision: 15, scale: 2 }),
  maxAmount: decimal("maxAmount", { precision: 15, scale: 2 }),
  interestRateMin: decimal("interestRateMin", { precision: 5, scale: 2 }),
  interestRateMax: decimal("interestRateMax", { precision: 5, scale: 2 }),
  termMin: int("termMin"),
  termMax: int("termMax"),
  requirements: text("requirements"),
  minCreditScore: int("minCreditScore"),
  features: text("features"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BankProduct = typeof bankProducts.$inferSelect;
export type InsertBankProduct = typeof bankProducts.$inferInsert;

// ============================================================
// 客户-银行产品匹配记录表
// ============================================================
export const matchRecords = mysqlTable("match_records", {
  id: int("id").autoincrement().primaryKey(),
  creditReportId: int("creditReportId").notNull(),
  bankProductId: int("bankProductId").notNull(),
  matchScore: int("matchScore"),
  matchedBy: int("matchedBy"),
  status: mysqlEnum("status", ["pending", "accepted", "rejected", "applied"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MatchRecord = typeof matchRecords.$inferSelect;
export type InsertMatchRecord = typeof matchRecords.$inferInsert;

// ============================================================
// 放款记录表
// ============================================================
export const disbursements = mysqlTable("disbursements", {
  id: int("id").autoincrement().primaryKey(),
  creditReportId: int("creditReportId"),
  bankProductId: int("bankProductId"),
  customerName: varchar("customerName", { length: 128 }).notNull(),
  bankName: varchar("bankName", { length: 128 }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  commission: decimal("commission", { precision: 15, scale: 2 }),
  employeeId: int("employeeId").notNull(),
  employeeName: varchar("employeeName", { length: 128 }),
  branchId: int("branchId"),
  teamId: int("teamId"),
  status: mysqlEnum("status", ["pending", "approved", "disbursed", "completed", "cancelled"]).default("pending").notNull(),
  disbursedAt: timestamp("disbursedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Disbursement = typeof disbursements.$inferSelect;
export type InsertDisbursement = typeof disbursements.$inferInsert;

// ============================================================
// 每日统计表
// ============================================================
export const dailyStats = mysqlTable("daily_stats", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  branchId: int("branchId"),
  teamId: int("teamId"),
  newCreditReports: int("newCreditReports").default(0).notNull(),
  newCustomersA: int("newCustomersA").default(0).notNull(),
  newCustomersB: int("newCustomersB").default(0).notNull(),
  newCustomersC: int("newCustomersC").default(0).notNull(),
  newDisbursements: int("newDisbursements").default(0).notNull(),
  disbursementAmount: decimal("disbursementAmount", { precision: 15, scale: 2 }).default("0").notNull(),
  commissionAmount: decimal("commissionAmount", { precision: 15, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DailyStat = typeof dailyStats.$inferSelect;
export type InsertDailyStat = typeof dailyStats.$inferInsert;

// ============================================================
// 操作日志表
// ============================================================
export const operationLogs = mysqlTable("operation_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  userName: varchar("userName", { length: 128 }),
  action: varchar("action", { length: 64 }).notNull(),
  module: varchar("module", { length: 64 }).notNull(),
  detail: text("detail"),
  ip: varchar("ip", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OperationLog = typeof operationLogs.$inferSelect;
export type InsertOperationLog = typeof operationLogs.$inferInsert;

// ============================================================
// 系统通知表
// ============================================================
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  content: text("content").notNull(),
  type: mysqlEnum("type", ["info", "success", "warning", "error"]).default("info").notNull(),
  isRead: int("isRead").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ============================================================
// AI视频任务表
// ============================================================
export const aiVideoTasks = mysqlTable("ai_video_tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 256 }),
  taskId: varchar("taskId", { length: 128 }),
  prompt: text("prompt").notNull(),
  imageUrl: text("imageUrl"),
  avatarUrl: text("avatarUrl"),
  voiceUrl: text("voiceUrl"),
  videoUrl: text("videoUrl"),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiVideoTask = typeof aiVideoTasks.$inferSelect;
export type InsertAiVideoTask = typeof aiVideoTasks.$inferInsert;
