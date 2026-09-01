import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../../config/env';
import { logger } from '../../../utils/logger';
import type {
  AIProvider,
  ChatMessage,
  AICompletionOptions,
  CategorizeResult,
} from './base.provider';
import {
  QUESTIONS_SYSTEM_PROMPT,
  SUMMARY_SYSTEM_PROMPT,
  CATEGORIZE_SYSTEM_PROMPT,
  ENHANCE_NOTE_SYSTEM_PROMPT,
} from '../ai.prompts';

export class AnthropicProvider implements AIProvider {
  readonly name = 'Anthropic';
  private client: Anthropic;
  private model: string;

  constructor() {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required when using Anthropic provider');
    }
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    this.model = env.ANTHROPIC_MODEL;
    logger.info(`AI Provider initialized: Anthropic (${this.model})`);
  }

  async chat(messages: ChatMessage[], options?: AICompletionOptions): Promise<string> {
    // Anthropic requires system message to be separate
    const systemMessage = messages.find((m) => m.role === 'system')?.content || '';
    const nonSystemMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens ?? 1024,
      system: systemMessage,
      messages: nonSystemMessages,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    return textBlock?.type === 'text' ? textBlock.text.trim() : '';
  }

  async generateQuestions(
    input: string,
    type: 'reminder' | 'note',
    existingContext?: string
  ): Promise<string[]> {
    const userMessage = existingContext
      ? `Type: ${type}\nInput: ${input}\nExisting context: ${existingContext}`
      : `Type: ${type}\nInput: ${input}`;

    const response = await this.chat([
      { role: 'system', content: QUESTIONS_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ]);

    try {
      return JSON.parse(response);
    } catch {
      return response
        .split('\n')
        .map((q) => q.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean);
    }
  }

  async generateSummary(
    input: string,
    type: 'reminder' | 'note',
    conversationHistory: ChatMessage[]
  ): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
      ...conversationHistory,
      {
        role: 'user',
        content: `Generate a rich, actionable summary for this ${type}.\n\nOriginal input: ${input}`,
      },
    ];

    return this.chat(messages, { temperature: 0.5 });
  }

  async categorize(input: string): Promise<CategorizeResult> {
    const response = await this.chat([
      { role: 'system', content: CATEGORIZE_SYSTEM_PROMPT },
      { role: 'user', content: input },
    ]);

    try {
      return JSON.parse(response);
    } catch {
      return { category: 'General', tags: [], confidence: 0.5 };
    }
  }

  async enhanceNote(content: string): Promise<{
    summary: string;
    keyPoints: string[];
    suggestedTitle?: string;
  }> {
    const response = await this.chat([
      { role: 'system', content: ENHANCE_NOTE_SYSTEM_PROMPT },
      { role: 'user', content: content },
    ]);

    try {
      return JSON.parse(response);
    } catch {
      return {
        summary: response,
        keyPoints: [],
      };
    }
  }
}
