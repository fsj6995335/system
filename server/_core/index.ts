import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import * as db from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // 开发模式：用户切换 API
  const devMode = process.env.NODE_ENV === "development" && process.env.DEV_AUTO_LOGIN === "true";
  if (devMode) {
    // 获取所有测试用户列表
    app.get("/api/dev/users", async (_req, res) => {
      try {
        const users = await db.getAllUsers();
        res.json(users);
      } catch (e) {
        res.status(500).json({ error: String(e) });
      }
    });

    // 切换当前开发用户（通过设置 cookie）
    app.post("/api/dev/switch-user", (req, res) => {
      const { openId } = req.body;
      if (!openId) {
        res.status(400).json({ error: "openId is required" });
        return;
      }
      res.cookie("dev_user", openId, { path: "/", maxAge: 365 * 24 * 60 * 60 * 1000 });
      res.json({ success: true, openId });
    });

    console.log("[Dev] Auto-login mode enabled. Use /api/dev/switch-user to switch roles.");
  }

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
