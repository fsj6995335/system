import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // 开发模式：支持通过 query 参数 ?dev_user=openId 切换用户
  const devMode = process.env.NODE_ENV === "development" && process.env.DEV_AUTO_LOGIN === "true";

  if (devMode) {
    // 从 referer URL 或直接请求中提取 dev_user 参数
    const referer = opts.req.headers.referer || "";
    let devUserOpenId: string | null = null;

    // 从 cookie 中读取当前选择的开发用户
    const cookies = opts.req.headers.cookie || "";
    const devUserCookie = cookies.split(";").find(c => c.trim().startsWith("dev_user="));
    if (devUserCookie) {
      devUserOpenId = decodeURIComponent(devUserCookie.split("=")[1]?.trim() || "");
    }

    // 默认使用 dev-owner（老板角色）
    if (!devUserOpenId) {
      devUserOpenId = "dev-owner";
    }

    try {
      user = await db.getUserByOpenId(devUserOpenId);
      if (!user) {
        // 如果用户不存在，回退到 dev-owner
        user = await db.getUserByOpenId("dev-owner");
      }
    } catch (e) {
      console.error("[Dev Auth] Failed to get dev user:", e);
    }
  } else {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
