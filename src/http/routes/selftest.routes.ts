import { Hono } from "hono";
import type { AppContext } from "../../config/env";
import { createServices } from "../../services";

export const selftestRoutes = new Hono<AppContext>();

type ChannelStatus = "ok" | "fail" | "skip";
type Channel = { id: string; label: string; status: ChannelStatus; detail: string };

type RawResult = {
  success?: boolean;
  skipped?: boolean;
  messageId?: string | number;
  error?: string;
};

function norm(r: RawResult | undefined): { status: ChannelStatus; detail: string } {
  if (!r) return { status: "fail", detail: "无响应" };
  if (r.skipped) return { status: "skip", detail: "未配置，按设计跳过" };
  if (r.success) {
    return { status: "ok", detail: r.messageId ? `已送达 · id ${String(r.messageId).slice(0, 24)}` : "已送达" };
  }
  return { status: "fail", detail: r.error || "未知错误" };
}

function beijing(): string {
  const d = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

// GET|POST /api/selftest?key=xxx
// 通知通道自检：真实发一条测试提醒，逐个通道回报成败 —— 专治「改完 secret 静默失效没人知道」。
// 密钥走 SELFTEST_KEY（Worker secret），由 rcj-lab 聚合后台服务端携带，不下发浏览器。
selftestRoutes.all("/", async (c) => {
  const provided = (c.req.query("key") || "").trim();
  const expect = (c.env.SELFTEST_KEY || "").trim();
  if (!expect || provided !== expect) {
    return c.json({ ok: false, error: "未授权" }, 401);
  }

  const services = createServices(c.env);
  const t = beijing();
  const text =
    `【通知自检】客服提醒通道\n` +
    `时间：${t}\n` +
    `这是一条测试消息 —— 收到即代表客服提醒链路正常。`;
  const html =
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px;">` +
    `<p style="font-size:16px;font-weight:700;color:#0d9488;">RCJ 客服 · 通知自检</p>` +
    `<p style="font-size:14px;color:#374151;line-height:1.6;">时间：${t}<br>这是一封测试邮件 —— 收到即代表客服的邮件提醒通道正常。</p>` +
    `<p style="font-size:12px;color:#9ca3af;">由聚合后台「通知通道自检」按钮触发，可忽略。</p></div>`;

  const [email, telegram, feishu] = await Promise.all([
    services.email
      .sendTest({ subject: "【通知自检】RCJ 客服邮件通道", html })
      .catch((e: unknown) => ({ success: false, error: String(e instanceof Error ? e.message : e) })),
    services.telegram
      .sendTest(text)
      .catch((e: unknown) => ({ success: false, error: String(e instanceof Error ? e.message : e) })),
    services.feishu
      .sendTest(text)
      .catch((e: unknown) => ({ success: false, error: String(e instanceof Error ? e.message : e) })),
  ]);

  const channels: Channel[] = [
    { id: "email", label: "邮件 (Resend)", ...norm(email) },
    { id: "telegram", label: "Telegram", ...norm(telegram) },
    { id: "feishu", label: "飞书群", ...norm(feishu) },
  ];

  return c.json({
    ok: true,
    target: "supportly",
    checkedAt: t,
    channels,
    failed: channels.filter((x) => x.status === "fail").length,
  });
});
