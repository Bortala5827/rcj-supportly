export type FeishuConfig = {
  /** 群「自定义机器人」webhook，最简路径 */
  webhookUrl: string;
  /** 自建应用机器人（webhook 缺失时回落） */
  appId: string;
  appSecret: string;
  chatId: string;
  enabled: boolean;
};

export type FeishuNotificationResult = {
  success: boolean;
  /** 未配置时返回 true，表示「本次不参与结果判定」，避免拖垮邮件/Telegram 的成功判定 */
  skipped?: boolean;
  messageId?: string;
  error?: string;
};

// 站长飞书群通知：客户来新消息时推送提醒（与 EmailService / TelegramService 并列）
// 凭证二选一：FEISHU_WEBHOOK_URL，或 FEISHU_APP_ID + FEISHU_APP_SECRET + FEISHU_CHAT_ID
export class FeishuService {
  constructor(private readonly config: FeishuConfig) {}

  get available(): boolean {
    return this.config.enabled && Boolean(this.config.webhookUrl || (this.config.appId && this.config.appSecret && this.config.chatId));
  }

  private getBeijingTime(): string {
    const beijingTime = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${beijingTime.getUTCFullYear()}-${p(beijingTime.getUTCMonth() + 1)}-${p(beijingTime.getUTCDate())} ${p(beijingTime.getUTCHours())}:${p(beijingTime.getUTCMinutes())}`;
  }

  private async sendMessage(text: string): Promise<FeishuNotificationResult> {
    if (!this.config.enabled) return { success: false, error: "Feishu notification not configured" };
    if (!this.config.webhookUrl && !(this.config.appId && this.config.appSecret && this.config.chatId)) {
      return { success: false, error: "Feishu notification not configured" };
    }

    try {
      if (this.config.webhookUrl) {
        const response = await fetch(this.config.webhookUrl, {
          method: "POST",
          headers: { "content-type": "application/json; charset=utf-8" },
          body: JSON.stringify({ msg_type: "text", content: { text } }),
        });
        const data = (await response.json().catch(() => ({}))) as { code?: number; msg?: string };
        // 飞书 webhook 失败时仍返回 HTTP 200，须以 body 的 code 为准
        if (!response.ok || (data.code !== undefined && data.code !== 0)) {
          return { success: false, error: data.msg || `HTTP ${response.status}` };
        }
        return { success: true };
      }

      // 自建应用：tenant_access_token → im/v1/messages
      const tokenResponse = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ app_id: this.config.appId, app_secret: this.config.appSecret }),
      });
      const tokenData = (await tokenResponse.json().catch(() => ({}))) as {
        code?: number;
        msg?: string;
        tenant_access_token?: string;
      };
      if (!tokenResponse.ok || tokenData.code !== 0 || !tokenData.tenant_access_token) {
        return { success: false, error: tokenData.msg || `HTTP ${tokenResponse.status}` };
      }

      const response = await fetch("https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id", {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8",
          authorization: `Bearer ${tokenData.tenant_access_token}`,
        },
        body: JSON.stringify({
          receive_id: this.config.chatId,
          msg_type: "text",
          content: JSON.stringify({ text }),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        code?: number;
        msg?: string;
        data?: { message_id?: string };
      };
      if (!response.ok || data.code !== 0) {
        return { success: false, error: data.msg || `HTTP ${response.status}` };
      }
      return { success: true, messageId: data.data?.message_id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async sendNewMessageNotification(input: {
    contactName: string;
    channel: string;
    messageContent: string;
    conversationId: string;
    messageTime?: string;
  }): Promise<FeishuNotificationResult> {
    if (!this.available) return { success: true, skipped: true };
    const timeStr = input.messageTime || this.getBeijingTime();
    const content = input.messageContent.length > 500 ? `${input.messageContent.slice(0, 500)}…` : input.messageContent;
    const text =
      `【客服提醒】${input.contactName} 发来新消息\n` +
      `渠道：${input.channel} · ${timeStr}\n` +
      `${content}\n` +
      `回复：https://955827.xyz/admin?conversation=${input.conversationId}`;
    return this.sendMessage(text);
  }
}
