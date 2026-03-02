import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  aiVideoTasks,
  loanApplications,
  loanApprovals,
  loanRepayments,
  notifications,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getLoanApplications(opts: {
  userId?: number;
  status?: string;
  search?: string;
  loanType?: string;
  page?: number;
  pageSize?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const { userId, status, search, loanType, page = 1, pageSize = 20 } = opts;
  const conditions = [];
  if (userId) conditions.push(eq(loanApplications.applicantId, userId));
  if (status) conditions.push(eq(loanApplications.status, status as any));
  if (loanType) conditions.push(eq(loanApplications.loanType, loanType as any));
  if (search) {
    conditions.push(
      or(like(loanApplications.applicantName, `%${search}%`), like(loanApplications.purpose, `%${search}%`))
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [items, countResult] = await Promise.all([
    db.select().from(loanApplications).where(where).orderBy(desc(loanApplications.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` }).from(loanApplications).where(where),
  ]);
  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function getLoanById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(loanApplications).where(eq(loanApplications.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createLoanApplication(data: {
  applicantId: number;
  applicantName: string;
  amount: string;
  purpose: string;
  loanType: "personal" | "business" | "mortgage" | "education" | "emergency";
  termMonths: number;
  collateral?: string;
  monthlyIncome?: string;
  employmentStatus?: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(loanApplications).values({ ...data, status: "pending" });
}

export async function updateLoanApplication(id: number, data: Partial<{
  amount: string; purpose: string;
  loanType: "personal" | "business" | "mortgage" | "education" | "emergency";
  termMonths: number; collateral: string; monthlyIncome: string;
  employmentStatus: string; notes: string;
  status: "draft" | "pending" | "under_review" | "approved" | "rejected" | "disbursed" | "repaying" | "completed" | "overdue";
  interestRate: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(loanApplications).set(data).where(eq(loanApplications.id, id));
}

export async function getLoanApprovals(loanId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(loanApprovals).where(eq(loanApprovals.loanId, loanId)).orderBy(desc(loanApprovals.createdAt));
}

export async function createLoanApproval(data: {
  loanId: number; reviewerId: number; reviewerName: string;
  action: "submit" | "approve" | "reject" | "request_info" | "disburse";
  comment?: string; previousStatus?: string; newStatus?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(loanApprovals).values(data);
}

export async function getPendingLoans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(loanApplications)
    .where(or(eq(loanApplications.status, "pending"), eq(loanApplications.status, "under_review")))
    .orderBy(desc(loanApplications.createdAt));
}

export async function getLoanRepayments(loanId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(loanRepayments).where(eq(loanRepayments.loanId, loanId)).orderBy(desc(loanRepayments.paymentDate));
}

export async function createRepayment(data: {
  loanId: number; amount: string; paymentDate: Date; paymentMethod?: string; notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(loanRepayments).values({ ...data, status: "completed" });
}

export async function getUserNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function createNotification(data: {
  userId: number; title: string; content: string;
  type?: "info" | "success" | "warning" | "error"; relatedLoanId?: number;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({ ...data, isRead: 0 });
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: 1 }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: 1 }).where(eq(notifications.userId, userId));
}

export async function createAiVideoTask(data: { userId: number; prompt: string; imageUrl?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(aiVideoTasks).values({ ...data, status: "pending" });
}

export async function updateAiVideoTask(id: number, data: Partial<{
  taskId: string; videoUrl: string;
  status: "pending" | "processing" | "completed" | "failed"; errorMessage: string;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(aiVideoTasks).set(data).where(eq(aiVideoTasks.id, id));
}

export async function getAiVideoTasks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiVideoTasks).where(eq(aiVideoTasks.userId, userId)).orderBy(desc(aiVideoTasks.createdAt)).limit(20);
}

export async function getAiVideoTaskById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(aiVideoTasks).where(eq(aiVideoTasks.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return null;
  const [totalLoans, statusCounts, typeCounts, recentLoans] = await Promise.all([
    db.select({ count: sql<number>`count(*)`, totalAmount: sql<string>`sum(amount)` }).from(loanApplications),
    db.select({ status: loanApplications.status, count: sql<number>`count(*)` }).from(loanApplications).groupBy(loanApplications.status),
    db.select({ loanType: loanApplications.loanType, count: sql<number>`count(*)`, totalAmount: sql<string>`sum(amount)` }).from(loanApplications).groupBy(loanApplications.loanType),
    db.select().from(loanApplications).orderBy(desc(loanApplications.createdAt)).limit(5),
  ]);
  return {
    totalCount: Number(totalLoans[0]?.count ?? 0),
    totalAmount: totalLoans[0]?.totalAmount ?? "0",
    statusCounts,
    typeCounts,
    recentLoans,
  };
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function getMonthlyStats() {
  const db = await getDb();
  if (!db) return [];
  const results = await db
    .select({
      month: sql<string>`DATE_FORMAT(createdAt, '%Y-%m')`,
      count: sql<number>`count(*)`,
      totalAmount: sql<string>`sum(amount)`,
    })
    .from(loanApplications)
    .groupBy(sql`DATE_FORMAT(createdAt, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(createdAt, '%Y-%m')`)
    .limit(12);
  return results;
}
