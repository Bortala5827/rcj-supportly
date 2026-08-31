import { app } from "./app";
import { createServices } from "./services";

export { AdminStream } from "./durable-objects/admin-stream";
export { VisitorStream } from "./durable-objects/visitor-stream";

// 定时清理：每天删除 7 天以上未更新的匿名访客会话（含子消息）
async function scheduledCleanup(env: any): Promise<void> {
  try {
    const services = createServices(env);
    const result = await services.conversations.deleteAnonymousConversations(7);
    console.log(`[cron] cleaned anonymous conversations: ${result.deletedConversations}`);
  } catch (err) {
    console.error("[cron] cleanup failed", err);
  }
}

export default {
  fetch: (request: Request, env: any, ctx: ExecutionContext) => app.fetch(request, env, ctx),
  scheduled: (controller: any, env: any, ctx: ExecutionContext) => {
    ctx.waitUntil(scheduledCleanup(env));
  },
};
