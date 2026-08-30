import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppContext } from "./config/env";
import { errorMiddleware, errorResponse } from "./http/middleware/error.middleware";
import { requestIdMiddleware } from "./http/middleware/request-id.middleware";
import { adminRoutes } from "./http/routes/admin.routes";
import { authRoutes } from "./http/routes/auth.routes";
import { channelsRoutes } from "./http/routes/channels.routes";
import { conversationsRoutes } from "./http/routes/conversations.routes";
import { healthRoutes } from "./http/routes/health.routes";
import { knowledgeRoutes } from "./http/routes/knowledge.routes";
import { webhookRoutes } from "./http/routes/webhook.routes";
import { widgetRoutes } from "./http/routes/widget.routes";

export const app = new Hono<AppContext>();

app.use("*", requestIdMiddleware());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Authorization",
      "Content-Type",
      "Range",
      "X-Admin-User-Id",
      "X-Debug-Response",
      "X-Request-Id",
      "X-Supportly-Signature",
      "X-Telegram-Bot-Api-Secret-Token",
    ],
    exposeHeaders: ["Accept-Ranges", "Content-Length", "Content-Range", "Content-Type", "X-Request-Id"],
    maxAge: 86400,
  })
);
app.use("*", errorMiddleware());

// 根路径 - 重定向到客服后台
app.get("/", (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RCJ 客服系统</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; background: linear-gradient(135deg, #0d9488, #14b8a6); min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
    .card { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); text-align: center; max-width: 400px; }
    h1 { color: #111827; margin-bottom: 8px; font-size: 24px; }
    p { color: #6b7280; margin-bottom: 24px; font-size: 14px; }
    .btn { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #0d9488, #14b8a6); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; transition: transform 0.15s; }
    .btn:hover { transform: translateY(-2px); }
    .status { margin-top: 20px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="card">
    <h1>💬 RCJ 客服系统</h1>
    <p>多渠道智能客服平台</p>
    <a href="https://exam.955827.xyz/admin.html" class="btn">进入管理后台</a>
    <div class="status">API 服务正常运行中</div>
  </div>
</body>
</html>`);
});

app.route("/health", healthRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/channels", channelsRoutes);
app.route("/api/conversations", conversationsRoutes);
app.route("/api/knowledge", knowledgeRoutes);
app.route("/api/widget", widgetRoutes);
app.route("/webhooks", webhookRoutes);

app.onError((error, c) => errorResponse(error, c));

app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404));
