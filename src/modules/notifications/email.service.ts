export type EmailNotificationInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type EmailConfig = {
  apiKey: string;
  from: string;
  to: string;
  enabled: boolean;
};

export class EmailService {
  constructor(private readonly config: EmailConfig) {}

  // 手动计算北京时间（UTC+8），避免依赖 toLocaleString 的时区支持
  private getBeijingTime(): string {
    const now = new Date();
    // 北京时间 = UTC + 8小时
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const year = beijingTime.getUTCFullYear();
    const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(beijingTime.getUTCDate()).padStart(2, '0');
    const hours = String(beijingTime.getUTCHours()).padStart(2, '0');
    const minutes = String(beijingTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(beijingTime.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  async sendNotification(input: EmailNotificationInput): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.config.enabled || !this.config.apiKey || !this.config.to) {
      return { success: false, error: "Email notification not configured" };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          from: this.config.from || "onboarding@resend.dev",
          to: [input.to || this.config.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, error: data.message || `HTTP ${response.status}` };
      }
      return { success: true, messageId: data.id };
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
  }): Promise<{ success: boolean; error?: string }> {
    const timeStr = input.messageTime || this.getBeijingTime();
    const subject = `【客服提醒】${input.contactName} 发来新消息`;
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>客服消息提醒</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #0d9488; color: white; padding: 20px 24px; border-radius: 12px 12px 0 0;">
      <h2 style="margin: 0; font-size: 18px;">新的客服消息</h2>
    </div>
    <div style="background: #ffffff; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
      <table style="width: 100%; margin-bottom: 16px; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #6b7280; width: 80px;">访客</td>
          <td style="padding: 6px 0; color: #111827; font-weight: 600;">${input.contactName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">渠道</td>
          <td style="padding: 6px 0; color: #111827;">${input.channel}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">时间</td>
          <td style="padding: 6px 0; color: #111827;">${timeStr}</td>
        </tr>
      </table>
      <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 3px solid #0d9488; margin-bottom: 20px;">
        <p style="margin: 0; color: #111827; font-size: 14px; line-height: 1.6;">${input.messageContent}</p>
      </div>
      <div style="margin-bottom: 16px; text-align: center;">
        <a href="https://955827.xyz/admin?conversation=${input.conversationId}" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #0d9488, #14b8a6); color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 700; letter-spacing: 1px;">
          马上回复
        </a>
      </div>
      <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
        会话 ID: ${input.conversationId} · 点击按钮自动打开后台并定位到该会话
      </p>
    </div>
  </div>
</body>
</html>`;

    return this.sendNotification({ to: this.config.to, subject, html });
  }
}
