import { prisma } from '../../config/database';
import { getAIProvider } from '../../config/ai';
import { ApiError } from '../../utils/api-error';
import { logger } from '../../utils/logger';
import type { ChatMessage } from './providers/base.provider';
import type {
  AskQuestionsInput,
  AnswerInput,
  SummarizeInput,
  EnhanceNoteInput,
} from './ai.schema';

export class AIService {
  /**
   * Generate intelligent follow-up questions for a reminder or note.
   * Persists the conversation to the database.
   */
  async askQuestions(userId: string, input: AskQuestionsInput) {
    const provider = await getAIProvider();
    logger.info(`Generating questions via ${provider.name} for ${input.type}`);

    // Verify ownership if linked to existing reminder/note
    if (input.reminderId) {
      await this.verifyReminderOwnership(userId, input.reminderId);
    }
    if (input.noteId) {
      await this.verifyNoteOwnership(userId, input.noteId);
    }

    const questions = await provider.generateQuestions(
      input.input,
      input.type,
      input.existingContext
    );

    // Persist conversation
    const conversationEntries = [
      {
        role: 'user',
        content: input.input,
        reminderId: input.reminderId || null,
        noteId: input.noteId || null,
      },
      {
        role: 'assistant',
        content: JSON.stringify(questions),
        reminderId: input.reminderId || null,
        noteId: input.noteId || null,
      },
    ];

    await prisma.aiConversation.createMany({
      data: conversationEntries,
    });

    return { questions, type: input.type };
  }

  /**
   * Process user's answers to follow-up questions.
   * Optionally generates a summary if all questions are answered.
   */
  async processAnswers(userId: string, input: AnswerInput) {
    const provider = await getAIProvider();

    if (input.reminderId) {
      await this.verifyReminderOwnership(userId, input.reminderId);
    }
    if (input.noteId) {
      await this.verifyNoteOwnership(userId, input.noteId);
    }

    // Store answers in conversation
    for (const { question, answer } of input.answers) {
      await prisma.aiConversation.createMany({
        data: [
          {
            role: 'assistant',
            content: question,
            reminderId: input.reminderId || null,
            noteId: input.noteId || null,
          },
          {
            role: 'user',
            content: answer,
            reminderId: input.reminderId || null,
            noteId: input.noteId || null,
          },
        ],
      });
    }

    let summary: string | null = null;

    if (input.generateSummary) {
      // Get full conversation history
      const history = await this.getConversationHistory(
        input.reminderId,
        input.noteId
      );

      const originalInput = history[0]?.content || '';
      const type = input.reminderId ? 'reminder' : 'note';

      summary = await provider.generateSummary(originalInput, type, history);

      // Update the reminder/note with the AI summary
      if (input.reminderId) {
        await prisma.reminder.update({
          where: { id: input.reminderId },
          data: { aiSummary: summary },
        });
      }
      if (input.noteId) {
        await prisma.note.update({
          where: { id: input.noteId },
          data: { aiSummary: summary },
        });
      }

      // Store the summary in conversation
      await prisma.aiConversation.create({
        data: {
          role: 'assistant',
          content: `[SUMMARY]\n${summary}`,
          reminderId: input.reminderId || null,
          noteId: input.noteId || null,
        },
      });
    }

    return {
      answersProcessed: input.answers.length,
      summary,
    };
  }

  /**
   * Generate a summary from conversation history.
   */
  async summarize(userId: string, input: SummarizeInput) {
    const provider = await getAIProvider();

    if (input.reminderId) {
      await this.verifyReminderOwnership(userId, input.reminderId);
    }
    if (input.noteId) {
      await this.verifyNoteOwnership(userId, input.noteId);
    }

    const history = await this.getConversationHistory(
      input.reminderId,
      input.noteId
    );

    const summary = await provider.generateSummary(input.input, input.type, history);

    // Update the reminder/note
    if (input.reminderId) {
      await prisma.reminder.update({
        where: { id: input.reminderId },
        data: { aiSummary: summary },
      });
    }
    if (input.noteId) {
      await prisma.note.update({
        where: { id: input.noteId },
        data: { aiSummary: summary },
      });
    }

    return { summary };
  }

  /**
   * Auto-categorize input and suggest tags.
   */
  async categorize(input: string) {
    const provider = await getAIProvider();
    const result = await provider.categorize(input);
    logger.info(`Categorized as "${result.category}" with confidence ${result.confidence}`);
    return result;
  }

  /**
   * Enhance a note with AI-generated summary, key points, and title suggestion.
   */
  async enhanceNote(userId: string, input: EnhanceNoteInput) {
    const provider = await getAIProvider();

    if (input.noteId) {
      await this.verifyNoteOwnership(userId, input.noteId);
    }

    const result = await provider.enhanceNote(input.content);

    // Update the note if linked
    if (input.noteId) {
      await prisma.note.update({
        where: { id: input.noteId },
        data: {
          aiSummary: result.summary,
          aiKeyPoints: result.keyPoints,
          ...(result.suggestedTitle && { title: result.suggestedTitle }),
        },
      });
    }

    return result;
  }

  /**
   * Get AI conversation history for a reminder or note.
   */
  async getConversation(
    userId: string,
    id: string,
    type: 'reminder' | 'note'
  ) {
    if (type === 'reminder') {
      await this.verifyReminderOwnership(userId, id);
      return prisma.aiConversation.findMany({
        where: { reminderId: id },
        orderBy: { createdAt: 'asc' },
      });
    } else {
      await this.verifyNoteOwnership(userId, id);
      return prisma.aiConversation.findMany({
        where: { noteId: id },
        orderBy: { createdAt: 'asc' },
      });
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async getConversationHistory(
    reminderId?: string | null,
    noteId?: string | null
  ): Promise<ChatMessage[]> {
    const conversations = await prisma.aiConversation.findMany({
      where: {
        ...(reminderId && { reminderId }),
        ...(noteId && { noteId }),
      },
      orderBy: { createdAt: 'asc' },
    });

    return conversations.map((c) => ({
      role: c.role as ChatMessage['role'],
      content: c.content,
    }));
  }

  private async verifyReminderOwnership(userId: string, reminderId: string) {
    const reminder = await prisma.reminder.findFirst({
      where: { id: reminderId, userId },
    });
    if (!reminder) {
      throw ApiError.notFound('Reminder not found');
    }
    return reminder;
  }

  private async verifyNoteOwnership(userId: string, noteId: string) {
    const note = await prisma.note.findFirst({
      where: { id: noteId, userId },
    });
    if (!note) {
      throw ApiError.notFound('Note not found');
    }
    return note;
  }
}

export const aiService = new AIService();
