import OpenAI from 'openai';
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

export class OpenAIProvider implements AIProvider {
  readonly name = 'OpenAI';
  private client: OpenAI;
  private model: string;

  constructor() {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required when using OpenAI provider');
    }
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    this.model = env.OPENAI_MODEL;
    logger.info(`AI Provider initialized: OpenAI (${this.model})`);
  }

  async chat(messages: ChatMessage[], options?: AICompletionOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
    });

    return response.choices[0]?.message?.content?.trim() || '';
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
      // If the response isn't valid JSON, split by newlines
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
