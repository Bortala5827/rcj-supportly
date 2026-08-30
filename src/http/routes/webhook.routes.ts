import { Hono } from "hono";
import type { AppContext } from "../../config/env";
import { createServices } from "../../services";
import { logger } from "../../shared/logger";
import { ok } from "../responses";

export const webhookRoutes = new Hono<AppContext>();

webhookRoutes.post("/:channelAccountId", async (c) => {
  const debugResponse = c.req.query("debug") === "1" || c.req.header("x-debug-response") === "true";
  try {
  const services = createServices(c.env);
  const account = await services.channels.getAccount(c.req.param("channelAccountId"));
  const adapter = services.channels.getAdapter(account);

  await adapter.verify(c.req.raw.clone(), account);
  const inboundMessages = await adapter.parseInbound(c.req.raw.clone(), account);

  let accepted = 0;
  let duplicates = 0;
  let aiReplies = 0;
  let aiReplySendFailures = 0;
  const debugResults: Array<{
    conversationId: string;
    inboundMessageId: string;
    duplicate: boolean;
    aiMessage: { id: string; content: string | null; status: string } | null;
    aiReplySent: boolean;
    aiReplySendError?: string;
  }> = [];

  for (const inbound of inboundMessages) {
    const result = await services.conversations.receiveInboundMessage({ channelAccount: account, inbound });
    let aiReplySent = false;
    let aiReplySendError: string | undefined;

    if (result.duplicate) {
      duplicates += 1;
    } else {
      accepted += 1;
      // 邮件通知节流：5分钟内同一个会话只发一次通知
      (async () => {
        try {
          const shouldNotify = await services.conversations.shouldNotify(result.conversationId, 5);
          if (!shouldNotify) return;
          
          await services.email.sendNewMessageNotification({
            contactName: inbound.contactName || "匿名访客",
            channel: account.channelType === "telegram" ? "Telegram" : account.channelType === "web_chat" ? "网页" : account.channelType,
            messageContent: inbound.content || "(空消息)",
            conversationId: result.conversationId,
          });
          
          // 标记已发送通知
          await services.conversations.markNotified(result.conversationId);
        } catch (e) {
          logger.warn("email_notification_failed", {
            requestId: c.get("requestId"),
            conversationId: result.conversationId,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      })();
    }

    if (result.aiMessage) {
      aiReplies += 1;
      try {
        const sendResult = await adapter.sendMessage(account, {
          conversationId: result.conversationId,
          externalThreadId: inbound.externalThreadId,
          messageId: result.aiMessage.id,
          messageType: "text",
          content: result.aiMessage.content ?? "",
        });
        await services.messages.markSent(result.aiMessage.id, sendResult.externalMessageId);
        aiReplySent = true;
        logger.info("ai_reply_sent", {
          requestId: c.get("requestId"),
          conversationId: result.conversationId,
          messageId: result.aiMessage.id,
          externalMessageId: sendResult.externalMessageId,
        });
      } catch (error) {
        await services.messages.markFailed(
          result.aiMessage.id,
          error instanceof Error ? error.message : "AI reply send failed"
        );
        aiReplySendFailures += 1;
        aiReplySendError = error instanceof Error ? error.message : String(error);
        logger.warn("ai_reply_send_failed", {
          requestId: c.get("requestId"),
          conversationId: result.conversationId,
          messageId: result.aiMessage.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (debugResponse) {
      debugResults.push({
        conversationId: result.conversationId,
        inboundMessageId: result.inboundMessage.id,
        duplicate: result.duplicate,
        aiMessage: result.aiMessage
          ? {
              id: result.aiMessage.id,
              content: result.aiMessage.content,
              status: aiReplySent ? "sent" : result.aiMessage.status,
            }
          : null,
        aiReplySent,
        aiReplySendError,
      });
    }
  }

  const summary = {
    received: inboundMessages.length,
    accepted,
    duplicates,
    aiReplies,
    aiReplySendFailures,
  };

  return ok(debugResponse ? { ...summary, results: debugResults } : summary);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error("webhook_error", { 
      channelAccountId: c.req.param("channelAccountId"),
      message: errorMessage,
      stack: errorStack,
    });
    if (debugResponse) {
      return c.json({ 
        error: { 
          code: "WEBHOOK_ERROR", 
          message: errorMessage,
          stack: errorStack,
        } 
      }, 500);
    }
    return c.json({ error: { code: "WEBHOOK_ERROR", message: "Webhook processing failed" } }, 500);
  }
});
