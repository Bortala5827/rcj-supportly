import type { InboundMessage } from "../../adapters/channel-adapter";
import { AppError } from "../../shared/errors";
import type { ChannelAccount } from "../channels/channel.types";
import { AiService } from "../ai/ai.service";
import { MessageRepository } from "../messages/message.repository";
import type { Message } from "../messages/message.types";
import { ConversationRepository } from "./conversation.repository";

export class ConversationService {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly messages: MessageRepository,
    private readonly ai: AiService
  ) {}

  listOpenConversations() {
    return this.conversations.listOpen();
  }

  async getConversation(id: string) {
    const conversation = await this.conversations.findById(id);
    if (!conversation) {
      throw new AppError("CONVERSATION_NOT_FOUND", "Conversation not found", 404);
    }
    return conversation;
  }

  async receiveInboundMessage(input: {
    channelAccount: ChannelAccount;
    inbound: InboundMessage;
    messageId?: string;
  }, options: { createAiReply?: boolean } = {}): Promise<{
    conversationId: string;
    inboundMessage: Message;
    aiMessage: Message | null;
    duplicate: boolean;
  }> {
    if (input.inbound.externalMessageId) {
      const existingMessage = await this.messages.findByExternalMessageId(
        input.channelAccount.id,
        input.inbound.externalMessageId
      );
      if (existingMessage) {
        return {
          conversationId: existingMessage.conversationId,
          inboundMessage: existingMessage,
          aiMessage: null,
          duplicate: true,
        };
      }
    }

    const conversation = await this.conversations.findOrCreateByExternalThread({
      channelAccountId: input.channelAccount.id,
      externalContactId: input.inbound.externalContactId,
      externalThreadId: input.inbound.externalThreadId,
      contactName: input.inbound.contactName,
      contactAvatarUrl: input.inbound.contactAvatarUrl,
      isAnonymous: input.inbound.isAnonymous,
    });

    const inboundResult = await this.messages.createInbound({
      id: input.messageId,
      conversationId: conversation.id,
      channelAccountId: input.channelAccount.id,
      inbound: input.inbound,
    });
    const inboundMessage = inboundResult.message;

    if (!inboundResult.created) {
      return {
        conversationId: inboundMessage.conversationId,
        inboundMessage,
        aiMessage: null,
        duplicate: true,
      };
    }

    await this.conversations.touchAfterInbound(conversation.id, inboundMessage.id, inboundMessage.createdAt);

    if (options.createAiReply === false) {
      return {
        conversationId: conversation.id,
        inboundMessage,
        aiMessage: null,
        duplicate: false,
      };
    }

    const aiMessage = await this.createAiReply({
      conversationId: conversation.id,
      channelAccountId: input.channelAccount.id,
      messageContent: inboundMessage.content,
      handoffStatus: conversation.handoffStatus,
    });

    return {
      conversationId: conversation.id,
      inboundMessage,
      aiMessage,
      duplicate: false,
    };
  }

  async createAiReply(input: {
    conversationId: string;
    channelAccountId: string;
    messageContent: string | null;
    handoffStatus: "bot" | "agent";
  }): Promise<Message | null> {
    const aiMessage = await this.ai.maybeCreateReply(input);

    if (aiMessage) {
      await this.conversations.touchAfterOutbound(input.conversationId, aiMessage.id, aiMessage.createdAt);
    }

    return aiMessage;
  }

  async setHandoff(id: string, status: "bot" | "agent") {
    await this.getConversation(id);
    await this.conversations.setHandoffStatus(id, status);
    return this.getConversation(id);
  }

  async resolve(id: string) {
    await this.getConversation(id);
    await this.conversations.resolve(id);
    return this.getConversation(id);
  }

  // 邮件通知节流：5分钟内同一个会话只发一次通知
  async shouldNotify(conversationId: string, throttleMinutes: number = 5): Promise<boolean> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation.lastNotifiedAt) return true;
    
    const lastNotifyTime = new Date(conversation.lastNotifiedAt).getTime();
    const currentTime = Date.now();
    const elapsedMinutes = (currentTime - lastNotifyTime) / (1000 * 60);
    
    return elapsedMinutes >= throttleMinutes;
  }

  async markNotified(conversationId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.conversations.updateLastNotifiedAt(conversationId, now);
  }

  async deleteConversation(id: string): Promise<void> {
    await this.getConversation(id);
    // 先删除相关消息
    await this.messages.deleteByConversation(id);
    // 再删除会话
    await this.conversations.delete(id);
  }

  async cleanupOldConversations(days: number = 30): Promise<{ deletedConversations: number; deletedMessages: number }> {
    // 先删除旧消息
    const deletedMessages = await this.messages.deleteOldResolved(days);
    // 再删除旧会话
    const deletedConversations = await this.conversations.deleteOldResolved(days);
    return { deletedConversations, deletedMessages };
  }

  async getStats(): Promise<{ total: number; open: number; resolved: number }> {
    return this.conversations.countAll();
  }
}
