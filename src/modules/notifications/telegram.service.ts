export type TelegramConfig = {
  botToken: string;
  chatId: string;
  enabled: boolean;
};

export type TelegramNotificationResult = {
  success: boolean;
  messageId?: number;
  error?: string;
};

// 站长 Telegram 通知：客户来新消息时推送提醒（与 EmailService 并列，均走 widget 通知链路）
export class TelegramService {
  constructor(private readonly config: TelegramConfig) {}

  private getBeijingTime(): string {
    const beijingTime = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${beijingTime.getUTCFullYear()}-${p(beijingTime.getUTCMonth() + 1)}-${p(beijingTime.getUTCDate())} ${p(beijingTime.getUTCHours())}:${p(beijingTime.getUTCMinutes())}`;
  }

  private async sendMessage(text: string): Promise<TelegramNotificationResult> {
    if (!this.config.enabled || !this.config.botToken || !this.config.chatId) {
      return { success: false, error: "Telegram notification not configured" };
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${this.config.botToken}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: this.config.chatId,
          text,
          disable_web_page_preview: true,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        result?: { message_id?: number };
        description?: string;
      };
      if (!response.ok || !data.ok) {
        return { success: false, error: data.description || `HTTP ${response.status}` };
      }
      return { success: true, messageId: data.result?.message_id };
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
  }): Promise<TelegramNotificationResult> {
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
