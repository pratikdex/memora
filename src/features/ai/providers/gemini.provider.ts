import { GoogleGenerativeAI } from '@google/generative-ai';
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

export class GeminiProvider implements AIProvider {
  readonly name = 'Gemini';
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor() {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required when using Gemini provider');
    }
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    this.model = env.GEMINI_MODEL;
    logger.info(`AI Provider initialized: Gemini (${this.model})`);
  }

  async chat(messages: ChatMessage[], _options?: AICompletionOptions): Promise<string> {
    const systemInstruction = messages.find((m) => m.role === 'system')?.content;

    const model = this.genAI.getGenerativeModel({
      model: this.model,
      ...(systemInstruction && { systemInstruction }),
    });

    // Convert messages to Gemini format
    const history = messages
      .filter((m) => m.role !== 'system')
      .slice(0, -1) // All except the last message
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const lastMessage = messages.filter((m) => m.role !== 'system').slice(-1)[0];

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage?.content || '');
    const response = result.response;

    return response.text().trim();
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
