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

  async sendNotification(input: EmailNotificationInput): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.config.enabled || !this.config.apiKey || !this.config.to) {
      return { success: false, error: "Email notification not configured" };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
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
  }): Promise<{ success: boolean; error?: string }> {
    const subject = `【客服提醒】${input.contactName} 发来新消息`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0d9488, #14b8a6); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
          <h2 style="margin: 0; font-size: 20px;">💬 新的客服消息</h2>
        </div>
        <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin: 0 0 12px; color: #374151; font-size: 14px;">
            <strong>${input.contactName}</strong> 通过 <strong>${input.channel}</strong> 发来消息：
          </p>
          <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid #0d9488; margin-bottom: 20px;">
            <p style="margin: 0; color: #111827; font-size: 14px; line-height: 1.6;">${input.messageContent}</p>
          </div>
          <div style="text-align: center;">
            <a href="https://exam.955827.xyz/admin.html" style="display: inline-block; padding: 12px 24px; background: #0d9488; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
              立即回复 →
            </a>
          </div>
          <p style="margin: 20px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
            会话 ID: ${input.conversationId}
          </p>
        </div>
      </div>
    `;

    return this.sendNotification({ to: this.config.to, subject, html });
  }
}
