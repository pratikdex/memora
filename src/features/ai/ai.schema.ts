import { z } from 'zod';

export const askQuestionsSchema = z.object({
  body: z.object({
    input: z.string().min(1, 'Input is required'),
    type: z.enum(['reminder', 'note']),
    existingContext: z.string().optional(),
    reminderId: z.string().uuid().optional(),
    noteId: z.string().uuid().optional(),
  }),
});

export const answerSchema = z.object({
  body: z.object({
    reminderId: z.string().uuid().optional(),
    noteId: z.string().uuid().optional(),
    answers: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ),
    generateSummary: z.boolean().default(false),
  }),
});

export const summarizeSchema = z.object({
  body: z.object({
    reminderId: z.string().uuid().optional(),
    noteId: z.string().uuid().optional(),
    input: z.string().min(1),
    type: z.enum(['reminder', 'note']),
  }),
});

export const categorizeSchema = z.object({
  body: z.object({
    input: z.string().min(1, 'Input is required'),
  }),
});

export const enhanceNoteSchema = z.object({
  body: z.object({
    noteId: z.string().uuid().optional(),
    content: z.string().min(1, 'Content is required'),
  }),
});

export const conversationIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({
    type: z.enum(['reminder', 'note']),
  }),
});

export type AskQuestionsInput = z.infer<typeof askQuestionsSchema>['body'];
export type AnswerInput = z.infer<typeof answerSchema>['body'];
export type SummarizeInput = z.infer<typeof summarizeSchema>['body'];
export type CategorizeInput = z.infer<typeof categorizeSchema>['body'];
export type EnhanceNoteInput = z.infer<typeof enhanceNoteSchema>['body'];
