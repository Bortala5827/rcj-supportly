import { DEFAULT_AI_MODEL } from "../config/constants";
import type { Env, WorkersAiBinding } from "../config/env";
import type { KnowledgeReference } from "./ai-search.gateway";

export type GenerateKnowledgeReplyResult = {
  text: string;
  metadata: {
    model: string;
    latencyMs: number;
    referencesCount: number;
  };
};

export class WorkersAiGateway {
  constructor(
    private readonly ai: WorkersAiBinding,
    private readonly env: Pick<Env, "DEFAULT_AI_MODEL">
  ) {}

  async generateKnowledgeReply(input: {
    question: string;
    references: KnowledgeReference[];
  }): Promise<GenerateKnowledgeReplyResult> {
    const model = this.env.DEFAULT_AI_MODEL || DEFAULT_AI_MODEL;
    const startedAt = Date.now();
    const prompt = buildKnowledgePrompt(input.question, input.references);
    const result = await this.ai.run(model, { prompt });

    return {
      text: extractText(result),
      metadata: {
        model,
        latencyMs: Date.now() - startedAt,
        referencesCount: input.references.length,
      },
    };
  }
}

function buildKnowledgePrompt(question: string, references: KnowledgeReference[]) {
  const context = references
    .map((reference, index) => {
      return `Source ${index + 1}: ${reference.title}\n${reference.text}`;
    })
    .join("\n\n");

  return [
    "You are the customer service assistant of RCJ Lab (support.955827.xyz), an independent AI product studio running entirely on Cloudflare.",
    "Answer the customer ONLY using the knowledge context below. If the answer is not in the context, say you are not sure and ask a human agent to help.",
    "Reply in the same language as the customer (简体中文 / 繁體中文 / English / 日本語). Keep replies short, plain and restrained — no marketing fluff, no invented facts, prices, links or promises.",
    "When a customer asks about a purchase, customization, or payment, guide them to the Shop (shop.955827.xyz). When they ask about voice preview or audio samples, guide them to the Voice site (voice.955827.xyz). Never fabricate order status or delivery details.",
    "Never ask customers to share API tokens, webhook secrets, passwords or other sensitive credentials in chat.",
    "",
    "RCJ ecosystem routing facts (use for routing only; quote details only when supported by the knowledge context):",
    "- Hub: 955827.xyz (RCJ Lab). Core products: Exam Hub (exam.955827.xyz), FaceTalk (facetalk.955827.xyz), Voice (voice.955827.xyz), Blog (blog.955827.xyz), Shop (shop.955827.xyz).",
    "- Voice: custom voice / a cappella singing service, preview tracks on voice.955827.xyz, from $19.9 USD, paid via the Shop.",
    "- Shop: custom question banks + one-stop website building + custom voice delivery, PayPal checkout, delivery by email with audio attachments.",
    "",
    `Question: ${question}`,
    "",
    `Knowledge context:\n${context}`,
  ].join("\n");
}

function extractText(result: unknown): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object") {
    const object = result as Record<string, unknown>;
    if (typeof object.response === "string") return object.response;
    if (typeof object.result === "string") return object.result;
    if (typeof object.text === "string") return object.text;
  }
  return "抱歉，我暂时无法根据知识库生成回答。";
}
