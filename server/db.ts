import { and, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, branches, teams, creditReports, bankProducts,
  matchRecords, disbursements, dailyStats, operationLogs,
  notifications, aiVideoTasks,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (e) { _db = null; }
  }
  return _db;
}

// ============ 用户 ============
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  (["name", "email", "loginMethod"] as const).forEach((f) => {
    if (user[f] !== undefined) { values[f] = user[f] ?? null; updateSet[f] = user[f] ?? null; }
  });
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "boss"; updateSet.role = "boss"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return r[0] ?? undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUser(id: number, data: Record<string, any>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, id));
}

// ============ 分公司 ============
export async function getBranches() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(branches).orderBy(branches.name);
}

export async function createBranch(data: { name: string; address?: string; phone?: string; managerId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(branches).values(data);
}

export async function updateBranch(id: number, data: Record<string, any>) {
  const db = await getDb();
  if (!db) return;
  await db.update(branches).set(data).where(eq(branches.id, id));
}

export async function deleteBranch(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(branches).where(eq(branches.id, id));
}

// ============ 团队 ============
export async function getTeams(branchId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conds = branchId ? eq(teams.branchId, branchId) : undefined;
  return db.select().from(teams).where(conds).orderBy(teams.name);
}

export async function createTeam(data: { name: string; branchId: number; leaderId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(teams).values(data);
}

export async function updateTeam(id: number, data: Record<string, any>) {
  const db = await getDb();
  if (!db) return;
  await db.update(teams).set(data).where(eq(teams.id, id));
}

export async function deleteTeam(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(teams).where(eq(teams.id, id));
}

// ============ 征信报告 ============
export async function getCreditReports(opts: {
  uploaderId?: number; teamId?: number; branchId?: number;
  status?: string; search?: string; grade?: string;
  page?: number; pageSize?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const { uploaderId, teamId, branchId, status, search, grade, page = 1, pageSize = 20 } = opts;
  const conds: any[] = [];
  if (uploaderId) conds.push(eq(creditReports.uploaderId, uploaderId));
  if (teamId) conds.push(eq(creditReports.teamId, teamId));
  if (branchId) conds.push(eq(creditReports.branchId, branchId));
  if (status) conds.push(eq(creditReports.status, status as any));
  if (grade) conds.push(eq(creditReports.customerGrade, grade as any));
  if (search) conds.push(or(like(creditReports.customerName, `%${search}%`), like(creditReports.customerPhone, `%${search}%`)));
  const where = conds.length > 0 ? and(...conds) : undefined;
  const [items, countR] = await Promise.all([
    db.select().from(creditReports).where(where).orderBy(desc(creditReports.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` }).from(creditReports).where(where),
  ]);
  return { items, total: Number(countR[0]?.count ?? 0) };
}

export async function getCreditReportById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const r = await db.select().from(creditReports).where(eq(creditReports.id, id)).limit(1);
  return r[0] ?? null;
}

export async function createCreditReport(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(creditReports).values(data);
}

export async function updateCreditReport(id: number, data: Record<string, any>) {
  const db = await getDb();
  if (!db) return;
  await db.update(creditReports).set(data).where(eq(creditReports.id, id));
}

export async function deleteCreditReport(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(creditReports).where(eq(creditReports.id, id));
}

// ============ 银行产品 ============
export async function getBankProducts(opts?: { productType?: string; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conds: any[] = [];
  if (opts?.productType) conds.push(eq(bankProducts.productType, opts.productType as any));
  if (opts?.status) conds.push(eq(bankProducts.status, opts.status as any));
  const where = conds.length > 0 ? and(...conds) : undefined;
  return db.select().from(bankProducts).where(where).orderBy(bankProducts.bankName);
}

export async function createBankProduct(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(bankProducts).values(data);
}

export async function updateBankProduct(id: number, data: Record<string, any>) {
  const db = await getDb();
  if (!db) return;
  await db.update(bankProducts).set(data).where(eq(bankProducts.id, id));
}

export async function deleteBankProduct(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(bankProducts).where(eq(bankProducts.id, id));
}

// ============ 匹配记录 ============
export async function getMatchRecords(creditReportId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conds = creditReportId ? eq(matchRecords.creditReportId, creditReportId) : undefined;
  return db.select().from(matchRecords).where(conds).orderBy(desc(matchRecords.createdAt));
}

export async function createMatchRecord(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(matchRecords).values(data);
}

// ============ 放款记录 ============
export async function getDisbursements(opts: {
  employeeId?: number; teamId?: number; branchId?: number;
  status?: string; search?: string; page?: number; pageSize?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const { employeeId, teamId, branchId, status, search, page = 1, pageSize = 20 } = opts;
  const conds: any[] = [];
  if (employeeId) conds.push(eq(disbursements.employeeId, employeeId));
  if (teamId) conds.push(eq(disbursements.teamId, teamId));
  if (branchId) conds.push(eq(disbursements.branchId, branchId));
  if (status) conds.push(eq(disbursements.status, status as any));
  if (search) conds.push(or(like(disbursements.customerName, `%${search}%`), like(disbursements.bankName, `%${search}%`)));
  const where = conds.length > 0 ? and(...conds) : undefined;
  const [items, countR] = await Promise.all([
    db.select().from(disbursements).where(where).orderBy(desc(disbursements.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` }).from(disbursements).where(where),
  ]);
  return { items, total: Number(countR[0]?.count ?? 0) };
}

export async function createDisbursement(data: any) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(disbursements).values(data);
}

export async function updateDisbursement(id: number, data: Record<string, any>) {
  const db = await getDb();
  if (!db) return;
  await db.update(disbursements).set(data).where(eq(disbursements.id, id));
}

// ============ 统计 ============
export async function getDashboardStats(opts?: { branchId?: number; teamId?: number }) {
  const db = await getDb();
  if (!db) return null;
  const conds: any[] = [];
  if (opts?.branchId) conds.push(eq(creditReports.branchId, opts.branchId));
  if (opts?.teamId) conds.push(eq(creditReports.teamId, opts.teamId));
  const crWhere = conds.length > 0 ? and(...conds) : undefined;

  const [totalCr, totalDisb, gradeStats, statusStats] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(creditReports).where(crWhere),
    db.select({ count: sql<number>`count(*)`, total: sql<string>`COALESCE(sum(amount),0)`, commission: sql<string>`COALESCE(sum(commission),0)` }).from(disbursements),
    db.select({ grade: creditReports.customerGrade, count: sql<number>`count(*)` }).from(creditReports).where(crWhere).groupBy(creditReports.customerGrade),
    db.select({ status: creditReports.status, count: sql<number>`count(*)` }).from(creditReports).where(crWhere).groupBy(creditReports.status),
  ]);
  return {
    totalCreditReports: Number(totalCr[0]?.count ?? 0),
    totalDisbursements: Number(totalDisb[0]?.count ?? 0),
    totalDisbursementAmount: totalDisb[0]?.total ?? "0",
    totalCommission: totalDisb[0]?.commission ?? "0",
    gradeStats, statusStats,
  };
}

export async function getDailyStats(opts?: { days?: number; branchId?: number; teamId?: number }) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dailyStats).orderBy(desc(dailyStats.date)).limit(opts?.days ?? 31);
}

export async function getRankings(opts?: { branchId?: number; teamId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conds: any[] = [];
  if (opts?.branchId) conds.push(eq(disbursements.branchId, opts.branchId));
  if (opts?.teamId) conds.push(eq(disbursements.teamId, opts.teamId));
  const where = conds.length > 0 ? and(...conds) : undefined;
  return db.select({
    employeeId: disbursements.employeeId,
    employeeName: disbursements.employeeName,
    count: sql<number>`count(*)`,
    totalAmount: sql<string>`COALESCE(sum(amount),0)`,
    totalCommission: sql<string>`COALESCE(sum(commission),0)`,
  }).from(disbursements).where(where).groupBy(disbursements.employeeId, disbursements.employeeName)
    .orderBy(desc(sql`sum(amount)`)).limit(50);
}

export async function getTeamRankings() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    teamId: disbursements.teamId,
    count: sql<number>`count(*)`,
    totalAmount: sql<string>`COALESCE(sum(amount),0)`,
    totalCommission: sql<string>`COALESCE(sum(commission),0)`,
  }).from(disbursements).groupBy(disbursements.teamId)
    .orderBy(desc(sql`sum(amount)`));
}

// ============ 操作日志 ============
export async function getOperationLogs(opts: { page?: number; pageSize?: number; module?: string }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const { page = 1, pageSize = 30, module } = opts;
  const conds = module ? eq(operationLogs.module, module) : undefined;
  const [items, countR] = await Promise.all([
    db.select().from(operationLogs).where(conds).orderBy(desc(operationLogs.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` }).from(operationLogs).where(conds),
  ]);
  return { items, total: Number(countR[0]?.count ?? 0) };
}

export async function createOperationLog(data: { userId: number; userName?: string; action: string; module: string; detail?: string; ip?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(operationLogs).values(data);
}

// ============ 通知 ============
export async function getUserNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function createNotification(data: { userId: number; title: string; content: string; type?: "info" | "success" | "warning" | "error" }) {
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

// ============ AI视频 ============
export async function createAiVideoTask(data: { userId: number; prompt: string; imageUrl?: string; title?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(aiVideoTasks).values({ ...data, status: "pending" });
}

export async function updateAiVideoTask(id: number, data: Partial<{ taskId: string; videoUrl: string; status: "pending" | "processing" | "completed" | "failed"; errorMessage: string }>) {
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
  const r = await db.select().from(aiVideoTasks).where(eq(aiVideoTasks.id, id)).limit(1);
  return r[0] ?? null;
}

// ============ 批量插入（用于模拟数据） ============
export async function bulkInsert(table: any, data: any[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.length === 0) return;
  await db.insert(table).values(data);
}
