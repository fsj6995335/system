import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createLoanApproval, createLoanApplication, createNotification, createRepayment,
  createAiVideoTask, getAllUsers, getAiVideoTaskById, getAiVideoTasks, getDashboardStats, getMonthlyStats,
  getLoanApprovals, getLoanApplications, getLoanById, getLoanRepayments, getPendingLoans,
  getUserNotifications, markAllNotificationsRead, markNotificationRead,
  updateAiVideoTask, updateLoanApplication, updateUserRole,
} from "./db";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
  }
  return next({ ctx });
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
  }),

  loans: router({
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(), search: z.string().optional(),
        loanType: z.string().optional(), page: z.number().default(1),
        pageSize: z.number().default(20), myOnly: z.boolean().default(false),
      }))
      .query(async ({ ctx, input }) => {
        const userId = input.myOnly || ctx.user.role !== "admin" ? ctx.user.id : undefined;
        return getLoanApplications({ ...input, userId });
      }),

    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const loan = await getLoanById(input.id);
        if (!loan) throw new TRPCError({ code: "NOT_FOUND", message: "贷款申请不存在" });
        if (ctx.user.role !== "admin" && loan.applicantId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "无权访问此贷款申请" });
        }
        return loan;
      }),

    create: protectedProcedure
      .input(z.object({
        amount: z.string(), purpose: z.string().min(1),
        loanType: z.enum(["personal", "business", "mortgage", "education", "emergency"]),
        termMonths: z.number().min(1).max(360),
        collateral: z.string().optional(), monthlyIncome: z.string().optional(),
        employmentStatus: z.string().optional(), notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createLoanApplication({
          applicantId: ctx.user.id,
          applicantName: ctx.user.name ?? "未知用户",
          ...input,
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(), amount: z.string().optional(), purpose: z.string().optional(),
        loanType: z.enum(["personal", "business", "mortgage", "education", "emergency"]).optional(),
        termMonths: z.number().optional(), collateral: z.string().optional(),
        monthlyIncome: z.string().optional(), employmentStatus: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const loan = await getLoanById(input.id);
        if (!loan) throw new TRPCError({ code: "NOT_FOUND" });
        if (ctx.user.role !== "admin" && loan.applicantId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (loan.status !== "pending" && loan.status !== "draft" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "该状态下无法修改申请" });
        }
        const { id, ...data } = input;
        await updateLoanApplication(id, data);
        return { success: true };
      }),

    approvals: protectedProcedure
      .input(z.object({ loanId: z.number() }))
      .query(({ input }) => getLoanApprovals(input.loanId)),

    repayments: protectedProcedure
      .input(z.object({ loanId: z.number() }))
      .query(({ input }) => getLoanRepayments(input.loanId)),

    addRepayment: adminProcedure
      .input(z.object({
        loanId: z.number(), amount: z.string(), paymentDate: z.date(),
        paymentMethod: z.string().optional(), notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await createRepayment(input);
        return { success: true };
      }),

    pending: adminProcedure.query(() => getPendingLoans()),

    approve: adminProcedure
      .input(z.object({
        loanId: z.number(),
        action: z.enum(["approve", "reject", "request_info", "disburse"]),
        comment: z.string().optional(), interestRate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const loan = await getLoanById(input.loanId);
        if (!loan) throw new TRPCError({ code: "NOT_FOUND" });
        const statusMap: Record<string, any> = {
          approve: "approved", reject: "rejected",
          request_info: "under_review", disburse: "disbursed",
        };
        const newStatus = statusMap[input.action];
        const previousStatus = loan.status;
        await updateLoanApplication(input.loanId, {
          status: newStatus,
          ...(input.interestRate ? { interestRate: input.interestRate } : {}),
        });
        await createLoanApproval({
          loanId: input.loanId, reviewerId: ctx.user.id,
          reviewerName: ctx.user.name ?? "管理员",
          action: input.action, comment: input.comment,
          previousStatus, newStatus,
        });
        const actionLabels: Record<string, string> = {
          approve: "已批准", reject: "已拒绝",
          request_info: "需补充材料", disburse: "已放款",
        };
        await createNotification({
          userId: loan.applicantId,
          title: `贷款申请${actionLabels[input.action]}`,
          content: `您的贷款申请（¥${loan.amount}）${actionLabels[input.action]}。${input.comment ? `备注：${input.comment}` : ""}`,
          type: input.action === "approve" || input.action === "disburse" ? "success" : input.action === "reject" ? "error" : "warning",
          relatedLoanId: input.loanId,
        });
        return { success: true };
      }),
  }),

  stats: router({
    dashboard: protectedProcedure.query(() => getDashboardStats()),
    monthly: protectedProcedure.query(() => getMonthlyStats()),
  }),

  notifications: router({
    list: protectedProcedure.query(({ ctx }) => getUserNotifications(ctx.user.id)),
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => markNotificationRead(input.id, ctx.user.id)),
    markAllRead: protectedProcedure.mutation(({ ctx }) => markAllNotificationsRead(ctx.user.id)),
  }),

  users: router({
    list: adminProcedure.query(() => getAllUsers()),
    updateRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ input }) => {
        await updateUserRole(input.userId, input.role);
        return { success: true };
      }),
  }),

  aiVideo: router({
    create: protectedProcedure
      .input(z.object({ prompt: z.string().min(1), imageUrl: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const DOUBAO_VIDEO_API_KEY = process.env.DOUBAO_VIDEO_API_KEY;
        if (!DOUBAO_VIDEO_API_KEY) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "视频API未配置" });
        const dbResult = await createAiVideoTask({ userId: ctx.user.id, prompt: input.prompt, imageUrl: input.imageUrl });
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
            const errorText = await response.text();
            await updateAiVideoTask(taskDbId, { status: "failed", errorMessage: errorText });
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `视频生成失败: ${errorText}` });
          }
          const data = await response.json();
          await updateAiVideoTask(taskDbId, { taskId: data.id, status: "processing" });
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
          const DOUBAO_VIDEO_API_KEY = process.env.DOUBAO_VIDEO_API_KEY;
          if (!DOUBAO_VIDEO_API_KEY) return task;
          try {
            const response = await fetch(`https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/${task.taskId}`, {
              headers: { Authorization: `Bearer ${DOUBAO_VIDEO_API_KEY}` },
            });
            if (response.ok) {
              const data = await response.json();
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

    list: protectedProcedure.query(({ ctx }) => getAiVideoTasks(ctx.user.id)),
  }),

  aiAnalysis: router({
    analyze: protectedProcedure
      .input(z.object({
        loanId: z.number().optional(), question: z.string().min(1), context: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const DOUBAO_CHAT_API_KEY = process.env.DOUBAO_CHAT_API_KEY;
        if (!DOUBAO_CHAT_API_KEY) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI分析API未配置" });
        let userContent: any[] = [];
        if (input.loanId) {
          const loan = await getLoanById(input.loanId);
          if (loan) {
            userContent.push({ type: "input_text", text: `贷款申请信息：\n- 申请人：${loan.applicantName}\n- 贷款金额：¥${loan.amount}\n- 贷款类型：${loan.loanType}\n- 贷款期限：${loan.termMonths}个月\n- 贷款用途：${loan.purpose}\n- 当前状态：${loan.status}\n- 月收入：${loan.monthlyIncome ? `¥${loan.monthlyIncome}` : "未提供"}\n- 就业状态：${loan.employmentStatus ?? "未提供"}\n- 抵押物：${loan.collateral ?? "无"}` });
          }
        }
        if (input.context) userContent.push({ type: "input_text", text: `补充信息：${input.context}` });
        userContent.push({ type: "input_text", text: input.question });
        const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${DOUBAO_CHAT_API_KEY}` },
          body: JSON.stringify({ model: "doubao-seed-2-0-pro-260215", input: [{ role: "user", content: userContent }] }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AI分析失败: ${errorText}` });
        }
        const data = await response.json();
        const answer = data.output?.choices?.[0]?.message?.content ?? data.output?.text ?? "分析完成，但未获取到结果";
        return { answer };
      }),
  }),
});

export type AppRouter = typeof appRouter;
