import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getEffectiveRole, hasPermission, getAiAnalysisDataScope } from "@shared/permissions";
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
    // 设置员工职位
    updatePosition: withPermission("manage_employees")
      .input(z.object({ userId: z.number(), position: z.string().max(128) }))
      .mutation(async ({ ctx, input }) => {
        await updateUser(input.userId, { position: input.position });
        await createOperationLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", action: "update_position", module: "users", detail: `用户ID:${input.userId} 职位设为:${input.position}` });
        return { success: true };
      }),
    // 调配员工到不同组
    assignTeam: withPermission("manage_employees")
      .input(z.object({ userId: z.number(), teamId: z.number().nullable(), branchId: z.number().nullable() }))
      .mutation(async ({ ctx, input }) => {
        await updateUser(input.userId, { teamId: input.teamId, branchId: input.branchId });
        await createOperationLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", action: "assign_team", module: "users", detail: `用户ID:${input.userId} 调配至团队:${input.teamId ?? '无'} 分公司:${input.branchId ?? '无'}` });
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
    // 征信报告图片自动提取关键信息
    extractCreditReport: withPermission("view_ai_analysis")
      .input(z.object({ imageUrl: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const DOUBAO_CHAT_API_KEY = process.env.DOUBAO_CHAT_API_KEY;
        if (!DOUBAO_CHAT_API_KEY) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI分析API未配置" });

        const systemPrompt = `你是一个专业的征信报告信息提取助手。请仔细分析用户上传的征信报告图片，提取以下关键信息并以严格的JSON格式返回（不要包含任何其他文字，只返回JSON）：

{
  "customerName": "客户姓名",
  "customerPhone": "手机号码（如有）",
  "customerIdCard": "身份证号码（如有）",
  "creditScore": 信用评分数值（如有，整数，没有则为null）,
  "monthlyIncome": "月收入金额（如有，纯数字字符串，没有则为null）",
  "totalDebt": "总负债金额（如有，纯数字字符串，没有则为null）",
  "hasOverdue": 是否有逾期（1表示有，0表示无）,
  "customerGrade": "客户等级（A/B/C/D，根据信用情况判断：A=优秀 B=良好 C=一般 D=较差）",
  "loanCount": 贷款笔数（整数，没有则为0）,
  "creditCardCount": 信用卡数量（整数，没有则为0）,
  "overdueCount": 逾期次数（整数，没有则为0）,
  "overdueAmount": "逾期金额（纯数字字符串，没有则为null）",
  "queryCount": 近期查询次数（整数，没有则为0）,
  "summary": "征信报告综合评价摘要（100字以内）",
  "riskLevel": "风险等级（低风险/中风险/高风险）",
  "suggestions": "贷款建议（200字以内）"
}

注意：
1. 如果图片不是征信报告，请返回 {"error": "上传的图片不是征信报告，请上传正确的征信报告图片"}
2. 无法识别的字段填null
3. 金额字段只保留数字，不要包含货币符号
4. 必须返回有效的JSON格式`;

        const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${DOUBAO_CHAT_API_KEY}` },
          body: JSON.stringify({
            model: "doubao-seed-2-0-pro-260215",
            input: [
              { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
              { role: "user", content: [
                { type: "input_image", image_url: input.imageUrl },
                { type: "input_text", text: "请分析这张征信报告图片，提取所有关键信息并以JSON格式返回。" }
              ]}
            ]
          }),
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `征信识别失败: ${errText}` });
        }
        const data = await response.json();
        const rawAnswer = data.output?.choices?.[0]?.message?.content ?? data.output?.text ?? data.output ?? "{}";
        const answerStr = typeof rawAnswer === "string" ? rawAnswer : JSON.stringify(rawAnswer);

        // 尝试解析JSON
        let extracted: any = {};
        try {
          // 去除可能的markdown代码块标记
          const cleaned = answerStr.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          extracted = JSON.parse(cleaned);
        } catch {
          // 如果解析失败，返回原始文本作为summary
          extracted = { summary: answerStr, error: "AI返回格式异常，请查看摘要信息" };
        }

        await createOperationLog({
          userId: ctx.user.id, userName: ctx.user.name ?? "",
          action: "extract_credit", module: "ai_analysis",
          detail: `征信图片提取:${extracted.customerName ?? "未识别"}`
        });

        return { extracted, rawAnswer: answerStr };
      }),

    // 批量征信报告图片提取
    batchExtractCreditReport: withPermission("view_ai_analysis")
      .input(z.object({ imageUrls: z.array(z.string().min(1)).min(1).max(20) }))
      .mutation(async ({ ctx, input }) => {
        const DOUBAO_CHAT_API_KEY = process.env.DOUBAO_CHAT_API_KEY;
        if (!DOUBAO_CHAT_API_KEY) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI分析API未配置" });

        const systemPrompt = `你是一个专业的征信报告信息提取助手。请仔细分析用户上传的征信报告图片，提取以下关键信息并以严格的JSON格式返回（不要包含任何其他文字，只返回JSON）：

{
  "customerName": "客户姓名",
  "customerPhone": "手机号码（如有）",
  "customerIdCard": "身份证号码（如有）",
  "creditScore": 信用评分数值（如有，整数，没有则为null）,
  "monthlyIncome": "月收入金额（如有，纯数字字符串，没有则为null）",
  "totalDebt": "总负债金额（如有，纯数字字符串，没有则为null）",
  "hasOverdue": 是否有逾期（1表示有，0表示无）,
  "customerGrade": "客户等级（A/B/C/D，根据信用情况判断：A=优秀 B=良好 C=一般 D=较差）",
  "loanCount": 贷款笔数（整数，没有则为0）,
  "creditCardCount": 信用卡数量（整数，没有则为0）,
  "overdueCount": 逾期次数（整数，没有则为0）,
  "overdueAmount": "逾期金额（纯数字字符串，没有则为null）",
  "queryCount": 近期查询次数（整数，没有则为0）,
  "summary": "征信报告综合评价摘要（100字以内）",
  "riskLevel": "风险等级（低风险/中风险/高风险）",
  "suggestions": "贷款建议（200字以内）"
}

注意：
1. 如果图片不是征信报告，请返回 {"error": "上传的图片不是征信报告，请上传正确的征信报告图片"}
2. 无法识别的字段填null
3. 金额字段只保留数字，不要包含货币符号
4. 必须返回有效的JSON格式`;

        const results: Array<{ index: number; imageUrl: string; extracted: any; rawAnswer: string; status: "success" | "error"; errorMsg?: string }> = [];

        // 逐张处理图片
        for (let i = 0; i < input.imageUrls.length; i++) {
          const imageUrl = input.imageUrls[i];
          try {
            const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/responses", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${DOUBAO_CHAT_API_KEY}` },
              body: JSON.stringify({
                model: "doubao-seed-2-0-pro-260215",
                input: [
                  { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
                  { role: "user", content: [
                    { type: "input_image", image_url: imageUrl },
                    { type: "input_text", text: "请分析这张征信报告图片，提取所有关键信息并以JSON格式返回。" }
                  ]}
                ]
              }),
            });
            if (!response.ok) {
              const errText = await response.text();
              results.push({ index: i, imageUrl, extracted: {}, rawAnswer: errText, status: "error", errorMsg: `API请求失败: ${response.status}` });
              continue;
            }
            const data = await response.json();
            const rawAnswer = data.output?.choices?.[0]?.message?.content ?? data.output?.text ?? data.output ?? "{}";
            const answerStr = typeof rawAnswer === "string" ? rawAnswer : JSON.stringify(rawAnswer);
            let extracted: any = {};
            try {
              const cleaned = answerStr.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
              extracted = JSON.parse(cleaned);
            } catch {
              extracted = { summary: answerStr, error: "AI返回格式异常" };
            }
            results.push({ index: i, imageUrl, extracted, rawAnswer: answerStr, status: extracted.error ? "error" : "success" });
          } catch (e: any) {
            results.push({ index: i, imageUrl, extracted: {}, rawAnswer: "", status: "error", errorMsg: e.message });
          }
        }

        await createOperationLog({
          userId: ctx.user.id, userName: ctx.user.name ?? "",
          action: "batch_extract_credit", module: "ai_analysis",
          detail: `批量征信提取: ${input.imageUrls.length}张图片, 成功${results.filter(r => r.status === "success").length}张`
        });

        return { results, total: input.imageUrls.length, successCount: results.filter(r => r.status === "success").length };
      }),

    // PDF征信报告文本提取与AI分析
    extractCreditPdf: withPermission("view_ai_analysis")
      .input(z.object({ pdfData: z.string().min(1), fileName: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const DOUBAO_CHAT_API_KEY = process.env.DOUBAO_CHAT_API_KEY;
        if (!DOUBAO_CHAT_API_KEY) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI分析API未配置" });

        // Step 1: 解析PDF提取文本
        let pdfText = "";
        let pageCount = 0;
        try {
          const { PDFParse } = await import("pdf-parse");
          const pdfBuffer = Buffer.from(input.pdfData, "base64");
          const parser = new PDFParse({ data: pdfBuffer });
          const textResult = await parser.getText();
          pdfText = textResult.pages.map((p: any) => p.text).join("\n");
          pageCount = textResult.total;
          if (!pdfText || pdfText.trim().length < 10) {
            throw new Error("PDF文本内容过少，可能是扫描件PDF");
          }
        } catch (e: any) {
          if (e.message?.includes("扫描件")) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "该PDF为扫描件或图片型PDF，无法直接提取文本。请使用图片提取功能，或将PDF转为图片后上传。" });
          }
          throw new TRPCError({ code: "BAD_REQUEST", message: `PDF解析失败: ${e.message}` });
        }

        // Step 2: 将提取的文本发送给豆包AI进行结构化分析
        const systemPrompt = `你是一个专业的征信报告信息提取助手。请仔细分析以下从PDF征信报告中提取的文本内容，提取关键信息并以严格的JSON格式返回（不要包含任何其他文字，只返回JSON）：

{
  "customerName": "客户姓名",
  "customerPhone": "手机号码（如有）",
  "customerIdCard": "身份证号码（如有）",
  "creditScore": 信用评分数值（如有，整数，没有则为null）,
  "monthlyIncome": "月收入金额（如有，纯数字字符串，没有则为null）",
  "totalDebt": "总负债金额（如有，纯数字字符串，没有则为null）",
  "hasOverdue": 是否有逾期（1表示有，0表示无）,
  "customerGrade": "客户等级（A/B/C/D，根据信用情况判断：A=优秀 B=良好 C=一般 D=较差）",
  "loanCount": 贷款笔数（整数，没有则为0）,
  "creditCardCount": 信用卡数量（整数，没有则为0）,
  "overdueCount": 逾期次数（整数，没有则为0）,
  "overdueAmount": "逾期金额（纯数字字符串，没有则为null）",
  "queryCount": 近期查询次数（整数，没有则为0）,
  "summary": "征信报告综合评价摘要（100字以内）",
  "riskLevel": "风险等级（低风险/中风险/高风险）",
  "suggestions": "贷款建议（200字以内）"
}

注意：
1. 如果文本内容不是征信报告，请返回 {"error": "上传的文件不是征信报告，请上传正确的征信报告PDF"}
2. 无法识别的字段填null
3. 金额字段只保留数字，不要包含货币符号
4. 必须返回有效的JSON格式`;

        // 截取前8000字符避免超长
        const truncatedText = pdfText.length > 8000 ? pdfText.slice(0, 8000) + "\n...（文本已截断）" : pdfText;

        const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${DOUBAO_CHAT_API_KEY}` },
          body: JSON.stringify({
            model: "doubao-seed-2-0-pro-260215",
            input: [
              { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
              { role: "user", content: [
                { type: "input_text", text: `以下是从PDF征信报告中提取的文本内容（共${pageCount}页）：\n\n${truncatedText}\n\n请分析以上征信报告内容，提取所有关键信息并以JSON格式返回。` }
              ]}
            ]
          }),
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI分析失败: ${errText}` });
        }
        const data = await response.json();
        const rawAnswer = data.output?.choices?.[0]?.message?.content ?? data.output?.text ?? data.output ?? "{}";
        const answerStr = typeof rawAnswer === "string" ? rawAnswer : JSON.stringify(rawAnswer);

        let extracted: any = {};
        try {
          const cleaned = answerStr.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          extracted = JSON.parse(cleaned);
        } catch {
          extracted = { summary: answerStr, error: "AI返回格式异常，请查看摘要信息" };
        }

        await createOperationLog({
          userId: ctx.user.id, userName: ctx.user.name ?? "",
          action: "extract_credit_pdf", module: "ai_analysis",
          detail: `PDF征信提取(${pageCount}页):${extracted.customerName ?? "未识别"}`
        });

        return { extracted, rawAnswer: answerStr, pdfInfo: { pageCount, textLength: pdfText.length } };
      }),

    // 批量混合提取（支持图片URL和PDF base64混合）
    batchMixedExtract: withPermission("view_ai_analysis")
      .input(z.object({
        items: z.array(z.object({
          type: z.enum(["image", "pdf"]),
          imageUrl: z.string().optional(),
          pdfData: z.string().optional(),
          fileName: z.string().optional(),
        })).min(1).max(20)
      }))
      .mutation(async ({ ctx, input }) => {
        const DOUBAO_CHAT_API_KEY = process.env.DOUBAO_CHAT_API_KEY;
        if (!DOUBAO_CHAT_API_KEY) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI分析API未配置" });

        const creditSystemPrompt = `你是一个专业的征信报告信息提取助手。请仔细分析内容，提取关键信息并以严格的JSON格式返回（不要包含任何其他文字，只返回JSON）：

{"customerName":"客户姓名","customerPhone":"手机号码","customerIdCard":"身份证号码","creditScore":信用评分数值,"monthlyIncome":"月收入金额","totalDebt":"总负债金额","hasOverdue":是否有逾期(1/0),"customerGrade":"客户等级(A/B/C/D)","loanCount":贷款笔数,"creditCardCount":信用卡数量,"overdueCount":逾期次数,"overdueAmount":"逾期金额","queryCount":近期查询次数,"summary":"综合评价(100字内)","riskLevel":"风险等级(低风险/中风险/高风险)","suggestions":"贷款建议(200字内)"}

注意：不是征信报告返回{"error":"不是征信报告"}，无法识别填null，金额只保留数字。`;

        const results: Array<{ index: number; fileName: string; fileType: string; extracted: any; rawAnswer: string; status: "success" | "error"; errorMsg?: string; pdfInfo?: { pageCount: number; textLength: number } }> = [];

        for (let i = 0; i < input.items.length; i++) {
          const item = input.items[i];
          try {
            let userContent: any[];

            if (item.type === "pdf") {
              // PDF: 先提取文本再发给AI
              if (!item.pdfData) { results.push({ index: i, fileName: item.fileName ?? `file_${i}`, fileType: "pdf", extracted: {}, rawAnswer: "", status: "error", errorMsg: "缺少PDF数据" }); continue; }
              const { PDFParse: PDFParseClass } = await import("pdf-parse");
              const pdfBuffer = Buffer.from(item.pdfData, "base64");
              const parser = new PDFParseClass({ data: pdfBuffer });
              const textResult = await parser.getText();
              const pdfText = textResult.pages.map((p: any) => p.text).join("\n");
              const pdfPageCount = textResult.total;
              if (!pdfText || pdfText.trim().length < 10) {
                results.push({ index: i, fileName: item.fileName ?? `file_${i}`, fileType: "pdf", extracted: { error: "PDF为扫描件或图片型，无法提取文本" }, rawAnswer: "", status: "error", errorMsg: "PDF为扫描件" });
                continue;
              }
              const truncated = pdfText.length > 8000 ? pdfText.slice(0, 8000) + "\n...(已截断)" : pdfText;
              userContent = [{ type: "input_text", text: `以下是PDF征信报告文本(${pdfPageCount}页)：\n\n${truncated}\n\n请提取关键信息并以JSON返回。` }];
              results.push({ index: i, fileName: item.fileName ?? `file_${i}`, fileType: "pdf", extracted: {}, rawAnswer: "", status: "success", pdfInfo: { pageCount: pdfPageCount, textLength: pdfText.length } });
            } else {
              // 图片: 直接发给视觉模型
              if (!item.imageUrl) { results.push({ index: i, fileName: item.fileName ?? `file_${i}`, fileType: "image", extracted: {}, rawAnswer: "", status: "error", errorMsg: "缺少图片URL" }); continue; }
              userContent = [
                { type: "input_image", image_url: item.imageUrl },
                { type: "input_text", text: "请分析这张征信报告图片，提取所有关键信息并以JSON格式返回。" }
              ];
            }

            const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/responses", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${DOUBAO_CHAT_API_KEY}` },
              body: JSON.stringify({
                model: "doubao-seed-2-0-pro-260215",
                input: [
                  { role: "system", content: [{ type: "input_text", text: creditSystemPrompt }] },
                  { role: "user", content: userContent }
                ]
              }),
            });
            if (!response.ok) {
              const errText = await response.text();
              const existingResult = results.find(r => r.index === i);
              if (existingResult) { existingResult.status = "error"; existingResult.errorMsg = `API失败: ${response.status}`; existingResult.rawAnswer = errText; }
              else results.push({ index: i, fileName: item.fileName ?? `file_${i}`, fileType: item.type, extracted: {}, rawAnswer: errText, status: "error", errorMsg: `API失败: ${response.status}` });
              continue;
            }
            const data = await response.json();
            const rawAnswer = data.output?.choices?.[0]?.message?.content ?? data.output?.text ?? data.output ?? "{}";
            const answerStr = typeof rawAnswer === "string" ? rawAnswer : JSON.stringify(rawAnswer);
            let extracted: any = {};
            try {
              const cleaned = answerStr.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
              extracted = JSON.parse(cleaned);
            } catch {
              extracted = { summary: answerStr, error: "AI返回格式异常" };
            }
            const existingResult = results.find(r => r.index === i);
            if (existingResult) { existingResult.extracted = extracted; existingResult.rawAnswer = answerStr; existingResult.status = extracted.error ? "error" : "success"; }
            else results.push({ index: i, fileName: item.fileName ?? `file_${i}`, fileType: item.type, extracted, rawAnswer: answerStr, status: extracted.error ? "error" : "success" });
          } catch (e: any) {
            const existingResult = results.find(r => r.index === i);
            if (existingResult) { existingResult.status = "error"; existingResult.errorMsg = e.message; }
            else results.push({ index: i, fileName: item.fileName ?? `file_${i}`, fileType: item.type, extracted: {}, rawAnswer: "", status: "error", errorMsg: e.message });
          }
        }

        await createOperationLog({
          userId: ctx.user.id, userName: ctx.user.name ?? "",
          action: "batch_mixed_extract", module: "ai_analysis",
          detail: `批量混合提取: ${input.items.length}个文件, 成功${results.filter(r => r.status === "success").length}个`
        });

        return { results, total: input.items.length, successCount: results.filter(r => r.status === "success").length };
      }),

    // 获取当前角色的 AI 分析数据范围
    getDataScope: withPermission("view_ai_analysis")
      .query(({ ctx }) => {
        const role = getEffectiveRole(ctx.user as any);
        const scope = getAiAnalysisDataScope(role);
        const scopeLabels: Record<string, string> = {
          all: "全公司数据",
          team: "本组/本部门数据",
          personal: "个人数据",
        };
        return { scope, label: scopeLabels[scope], role, teamId: (ctx.user as any).teamId ?? null, branchId: (ctx.user as any).branchId ?? null };
      }),

    analyze: withPermission("view_ai_analysis")
      .input(z.object({ question: z.string().min(1), context: z.string().optional(), imageUrl: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const DOUBAO_CHAT_API_KEY = process.env.DOUBAO_CHAT_API_KEY;
        if (!DOUBAO_CHAT_API_KEY) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI分析API未配置" });
        // 根据角色自动注入数据范围提示
        const role = getEffectiveRole(ctx.user as any);
        const scope = getAiAnalysisDataScope(role);
        const scopeHint = scope === "all" ? "你可以查看全公司数据。" : scope === "team" ? `你只能查看本组/本部门数据（teamId: ${(ctx.user as any).teamId ?? '未分配'}）。` : `你只能查看个人数据（userId: ${ctx.user.id}）。`;
        const userContent: any[] = [];
        if (input.imageUrl) userContent.push({ type: "input_image", image_url: input.imageUrl });
        // 自动拼接数据范围说明
        const contextText = [scopeHint, input.context].filter(Boolean).join(" ");
        if (contextText) userContent.push({ type: "input_text", text: `数据背景：${contextText}` });
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
        await createOperationLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", action: "ai_analyze", module: "ai_analysis", detail: `AI分析[${scope}]:${input.question.slice(0, 50)}` });
        return { answer: typeof answer === "string" ? answer : JSON.stringify(answer), dataScope: scope };
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
