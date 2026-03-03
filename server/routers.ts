import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getEffectiveRole, hasPermission } from "@shared/permissions";
import {
  getAllUsers, updateUser,
  getBranches, createBranch, updateBranch, deleteBranch,
  getTeams, createTeam, updateTeam, deleteTeam,
  getCreditReports, getCreditReportById, createCreditReport, updateCreditReport, deleteCreditReport,
  getBankProducts, createBankProduct, updateBankProduct, deleteBankProduct,
  getMatchRecords, createMatchRecord,
  getDisbursements, createDisbursement, updateDisbursement,
  getDashboardStats, getDailyStats, getRankings, getTeamRankings,
  getOperationLogs, createOperationLog,
  getUserNotifications, createNotification, markNotificationRead, markAllNotificationsRead,
  createAiVideoTask, updateAiVideoTask, getAiVideoTasks, getAiVideoTaskById,
} from "./db";
import { storagePut } from "./storage";

// 权限中间件
const withPermission = (perm: string) =>
  protectedProcedure.use(({ ctx, next }) => {
    const role = getEffectiveRole(ctx.user as any);
    if (!hasPermission(role, perm as any)) {
      throw new TRPCError({ code: "FORBIDDEN", message: `无权限: ${perm}` });
    }
    return next({ ctx: { ...ctx, effectiveRole: role } });
  });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    switchRole: protectedProcedure
      .input(z.object({ role: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await updateUser(ctx.user.id, { simulatedRole: input.role || null });
        return { success: true };
      }),
  }),

  // ============ 用户管理 ============
  users: router({
    list: withPermission("manage_employees").query(() => getAllUsers()),
    updateRole: withPermission("manage_employees")
      .input(z.object({ userId: z.number(), role: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await updateUser(input.userId, { role: input.role });
        await createOperationLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", action: "update_role", module: "users", detail: `用户ID:${input.userId} 角色改为:${input.role}` });
        return { success: true };
      }),
    update: withPermission("manage_employees")
      .input(z.object({ userId: z.number(), name: z.string().optional(), phone: z.string().optional(), branchId: z.number().optional(), teamId: z.number().optional() }))
      .mutation(async ({ input }) => {
        const { userId, ...data } = input;
        await updateUser(userId, data);
        return { success: true };
      }),
  }),

  // ============ 分公司管理 ============
  branches: router({
    list: protectedProcedure.query(() => getBranches()),
    create: withPermission("manage_branches")
      .input(z.object({ name: z.string().min(1), address: z.string().optional(), phone: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await createBranch(input);
        await createOperationLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", action: "create", module: "branches", detail: `创建分公司:${input.name}` });
        return { success: true };
      }),
    update: withPermission("manage_branches")
      .input(z.object({ id: z.number(), name: z.string().optional(), address: z.string().optional(), phone: z.string().optional(), status: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateBranch(id, data);
        return { success: true };
      }),
    delete: withPermission("delete_data")
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await deleteBranch(input.id); return { success: true }; }),
  }),

  // ============ 团队管理 ============
  teams: router({
    list: protectedProcedure
      .input(z.object({ branchId: z.number().optional() }).optional())
      .query(({ input }) => getTeams(input?.branchId)),
    create: withPermission("manage_teams")
      .input(z.object({ name: z.string().min(1), branchId: z.number(), leaderId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        await createTeam(input);
        await createOperationLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", action: "create", module: "teams", detail: `创建团队:${input.name}` });
        return { success: true };
      }),
    update: withPermission("manage_teams")
      .input(z.object({ id: z.number(), name: z.string().optional(), leaderId: z.number().optional() }))
      .mutation(async ({ input }) => { const { id, ...data } = input; await updateTeam(id, data); return { success: true }; }),
    delete: withPermission("delete_data")
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await deleteTeam(input.id); return { success: true }; }),
  }),

  // ============ 征信报告 ============
  creditReports: router({
    list: withPermission("view_credit_reports")
      .input(z.object({
        status: z.string().optional(), search: z.string().optional(), grade: z.string().optional(),
        page: z.number().default(1), pageSize: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        const role = getEffectiveRole(ctx.user as any);
        const opts: any = { ...input };
        if (!hasPermission(role, "view_all_data") && !hasPermission(role, "view_team_data")) {
          opts.uploaderId = ctx.user.id;
        } else if (hasPermission(role, "view_team_data") && !hasPermission(role, "view_all_data")) {
          opts.teamId = (ctx.user as any).teamId;
        }
        return getCreditReports(opts);
      }),
    byId: withPermission("view_credit_reports")
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getCreditReportById(input.id)),
    create: withPermission("upload_credit_report")
      .input(z.object({
        customerName: z.string().min(1), customerPhone: z.string().optional(),
        customerIdCard: z.string().optional(), creditScore: z.number().optional(),
        customerGrade: z.enum(["A", "B", "C", "D"]).default("C"),
        monthlyIncome: z.string().optional(), totalDebt: z.string().optional(),
        hasOverdue: z.number().default(0), notes: z.string().optional(),
        reportFileUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createCreditReport({
          ...input, uploaderId: ctx.user.id, uploaderName: ctx.user.name ?? "",
          branchId: (ctx.user as any).branchId, teamId: (ctx.user as any).teamId,
        });
        await createOperationLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", action: "create", module: "credit_reports", detail: `上传征信:${input.customerName}` });
        return { success: true };
      }),
    update: withPermission("edit_credit_report")
      .input(z.object({ id: z.number(), customerGrade: z.string().optional(), status: z.string().optional(), notes: z.string().optional(), creditScore: z.number().optional() }))
      .mutation(async ({ input }) => { const { id, ...data } = input; await updateCreditReport(id, data); return { success: true }; }),
    delete: withPermission("delete_credit_report")
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await deleteCreditReport(input.id); return { success: true }; }),
  }),

  // ============ 银行产品 ============
  bankProducts: router({
    list: withPermission("view_bank_products")
      .input(z.object({ productType: z.string().optional(), status: z.string().optional() }).optional())
      .query(({ input }) => getBankProducts(input ?? undefined)),
    create: withPermission("manage_bank_products")
      .input(z.object({
        bankName: z.string().min(1), productName: z.string().min(1),
        productType: z.enum(["mortgage", "business", "personal", "credit_card", "car_loan"]),
        minAmount: z.string().optional(), maxAmount: z.string().optional(),
        interestRateMin: z.string().optional(), interestRateMax: z.string().optional(),
        termMin: z.number().optional(), termMax: z.number().optional(),
        requirements: z.string().optional(), minCreditScore: z.number().optional(), features: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createBankProduct(input);
        await createOperationLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", action: "create", module: "bank_products", detail: `创建产品:${input.bankName}-${input.productName}` });
        return { success: true };
      }),
    update: withPermission("manage_bank_products")
      .input(z.object({ id: z.number(), bankName: z.string().optional(), productName: z.string().optional(), status: z.string().optional(), interestRateMin: z.string().optional(), interestRateMax: z.string().optional() }))
      .mutation(async ({ input }) => { const { id, ...data } = input; await updateBankProduct(id, data); return { success: true }; }),
    delete: withPermission("delete_data")
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await deleteBankProduct(input.id); return { success: true }; }),
  }),

  // ============ 匹配记录 ============
  matchRecords: router({
    list: protectedProcedure
      .input(z.object({ creditReportId: z.number().optional() }).optional())
      .query(({ input }) => getMatchRecords(input?.creditReportId)),
    create: withPermission("edit_credit_report")
      .input(z.object({ creditReportId: z.number(), bankProductId: z.number(), matchScore: z.number().optional(), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await createMatchRecord({ ...input, matchedBy: ctx.user.id });
        await updateCreditReport(input.creditReportId, { status: "matched" });
        return { success: true };
      }),
  }),

  // ============ 放款管理 ============
  disbursements: router({
    list: withPermission("view_disbursements")
      .input(z.object({
        status: z.string().optional(), search: z.string().optional(),
        page: z.number().default(1), pageSize: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        const role = getEffectiveRole(ctx.user as any);
        const opts: any = { ...input };
        if (!hasPermission(role, "view_all_data") && !hasPermission(role, "view_team_data")) {
          opts.employeeId = ctx.user.id;
        } else if (hasPermission(role, "view_team_data") && !hasPermission(role, "view_all_data")) {
          opts.teamId = (ctx.user as any).teamId;
        }
        return getDisbursements(opts);
      }),
    create: withPermission("manage_disbursements")
      .input(z.object({
        creditReportId: z.number().optional(), bankProductId: z.number().optional(),
        customerName: z.string().min(1), bankName: z.string().optional(),
        amount: z.string(), commission: z.string().optional(), notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createDisbursement({
          ...input, employeeId: ctx.user.id, employeeName: ctx.user.name ?? "",
          branchId: (ctx.user as any).branchId, teamId: (ctx.user as any).teamId,
          status: "pending",
        });
        await createOperationLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", action: "create", module: "disbursements", detail: `创建放款:${input.customerName} ¥${input.amount}` });
        return { success: true };
      }),
    update: withPermission("manage_disbursements")
      .input(z.object({ id: z.number(), status: z.string().optional(), notes: z.string().optional() }))
      .mutation(async ({ input }) => { const { id, ...data } = input; await updateDisbursement(id, data); return { success: true }; }),
  }),

  // ============ 统计 & 排名 ============
  stats: router({
    dashboard: withPermission("view_dashboard").query(() => getDashboardStats()),
    daily: withPermission("view_dashboard")
      .input(z.object({ days: z.number().default(31) }).optional())
      .query(({ input }) => getDailyStats({ days: input?.days ?? 31 })),
    rankings: withPermission("view_rankings")
      .input(z.object({ branchId: z.number().optional(), teamId: z.number().optional() }).optional())
      .query(({ input }) => getRankings(input ?? undefined)),
    teamRankings: withPermission("view_rankings").query(() => getTeamRankings()),
  }),

  // ============ 操作日志 ============
  operationLogs: router({
    list: withPermission("view_operation_logs")
      .input(z.object({ page: z.number().default(1), pageSize: z.number().default(30), module: z.string().optional() }))
      .query(({ input }) => getOperationLogs(input)),
  }),

  // ============ 通知 ============
  notifications: router({
    list: protectedProcedure.query(({ ctx }) => getUserNotifications(ctx.user.id)),
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => markNotificationRead(input.id, ctx.user.id)),
    markAllRead: protectedProcedure.mutation(({ ctx }) => markAllNotificationsRead(ctx.user.id)),
  }),

  // ============ 文件上传 ============
  upload: router({
    file: protectedProcedure
      .input(z.object({ fileName: z.string(), fileData: z.string(), contentType: z.string().default("application/octet-stream") }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileData, "base64");
        const key = `uploads/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(key, buffer, input.contentType);
        return { url, key };
      }),
  }),

  // ============ AI视频工作室 ============
  aiVideo: router({
    create: withPermission("use_ai_video")
      .input(z.object({ prompt: z.string().min(1), imageUrl: z.string().optional(), title: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const DOUBAO_VIDEO_API_KEY = process.env.DOUBAO_VIDEO_API_KEY;
        if (!DOUBAO_VIDEO_API_KEY) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "视频API未配置" });
        const dbResult = await createAiVideoTask({ userId: ctx.user.id, prompt: input.prompt, imageUrl: input.imageUrl, title: input.title });
        const taskDbId = (dbResult as any).insertId;
        try {
          const content: any[] = [{ type: "text", text: input.prompt }];
          if (input.imageUrl) content.push({ type: "image_url", image_url: { url: input.imageUrl } });
          const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${DOUBAO_VIDEO_API_KEY}` },
            body: JSON.stringify({ model: "doubao-seedance-1-5-pro-251215", content }),
          });
          if (!response.ok) {
            const errText = await response.text();
            await updateAiVideoTask(taskDbId, { status: "failed", errorMessage: errText });
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `视频生成失败: ${errText}` });
          }
          const data = await response.json();
          await updateAiVideoTask(taskDbId, { taskId: data.id, status: "processing" });
          await createOperationLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", action: "create_video", module: "ai_video", detail: `创建视频任务:${input.title ?? input.prompt.slice(0, 30)}` });
          return { taskDbId, apiTaskId: data.id };
        } catch (err: any) {
          if (err instanceof TRPCError) throw err;
          await updateAiVideoTask(taskDbId, { status: "failed", errorMessage: err.message });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
        }
      }),
    poll: protectedProcedure
      .input(z.object({ taskDbId: z.number() }))
      .query(async ({ ctx, input }) => {
        const task = await getAiVideoTaskById(input.taskDbId);
        if (!task) throw new TRPCError({ code: "NOT_FOUND" });
        if (task.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (task.status === "processing" && task.taskId) {
          const key = process.env.DOUBAO_VIDEO_API_KEY;
          if (!key) return task;
          try {
            const resp = await fetch(`https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/${task.taskId}`, {
              headers: { Authorization: `Bearer ${key}` },
            });
            if (resp.ok) {
              const data = await resp.json();
              if (data.status === "succeeded") {
                const videoUrl = data.content?.[0]?.video_url ?? data.content?.[0]?.url ?? "";
                await updateAiVideoTask(input.taskDbId, { status: "completed", videoUrl });
                return { ...task, status: "completed" as const, videoUrl };
              } else if (data.status === "failed") {
                await updateAiVideoTask(input.taskDbId, { status: "failed", errorMessage: data.error?.message ?? "生成失败" });
                return { ...task, status: "failed" as const };
              }
            }
          } catch {}
        }
        return task;
      }),
    list: withPermission("use_ai_video").query(({ ctx }) => getAiVideoTasks(ctx.user.id)),
  }),

  // ============ AI分析 ============
  aiAnalysis: router({
    analyze: withPermission("view_ai_analysis")
      .input(z.object({ question: z.string().min(1), context: z.string().optional(), imageUrl: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const DOUBAO_CHAT_API_KEY = process.env.DOUBAO_CHAT_API_KEY;
        if (!DOUBAO_CHAT_API_KEY) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI分析API未配置" });
        const userContent: any[] = [];
        if (input.imageUrl) userContent.push({ type: "input_image", image_url: input.imageUrl });
        if (input.context) userContent.push({ type: "input_text", text: `数据背景：${input.context}` });
        userContent.push({ type: "input_text", text: input.question });
        const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${DOUBAO_CHAT_API_KEY}` },
          body: JSON.stringify({ model: "doubao-seed-2-0-pro-260215", input: [{ role: "user", content: userContent }] }),
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI分析失败: ${errText}` });
        }
        const data = await response.json();
        const answer = data.output?.choices?.[0]?.message?.content ?? data.output?.text ?? data.output ?? "分析完成";
        await createOperationLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", action: "ai_analyze", module: "ai_analysis", detail: `AI分析:${input.question.slice(0, 50)}` });
        return { answer: typeof answer === "string" ? answer : JSON.stringify(answer) };
      }),
  }),

  // ============ AI助手 ============
  aiAssistant: router({
    chat: withPermission("use_ai_assistant")
      .input(z.object({ message: z.string().min(1), history: z.array(z.object({ role: z.string(), content: z.string() })).optional() }))
      .mutation(async ({ input }) => {
        const DOUBAO_CHAT_API_KEY = process.env.DOUBAO_CHAT_API_KEY;
        if (!DOUBAO_CHAT_API_KEY) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI助手API未配置" });
        const messages: any[] = [
          { role: "system", content: [{ type: "input_text", text: "你是一个专业的贷款行业AI助手，可以帮助用户生成营销文案、分析客户情况、提供贷款建议等。请用中文回答。" }] },
        ];
        if (input.history) {
          for (const h of input.history) {
            messages.push({ role: h.role, content: [{ type: "input_text", text: h.content }] });
          }
        }
        messages.push({ role: "user", content: [{ type: "input_text", text: input.message }] });
        const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${DOUBAO_CHAT_API_KEY}` },
          body: JSON.stringify({ model: "doubao-seed-2-0-pro-260215", input: messages }),
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI助手失败: ${errText}` });
        }
        const data = await response.json();
        const answer = data.output?.choices?.[0]?.message?.content ?? data.output?.text ?? data.output ?? "回复失败";
        return { answer: typeof answer === "string" ? answer : JSON.stringify(answer) };
      }),
  }),
});

export type AppRouter = typeof appRouter;
