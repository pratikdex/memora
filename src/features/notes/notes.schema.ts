import { z } from 'zod';

export const createNoteSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200),
    rawContent: z.string().min(1, 'Content is required'),
    tags: z.array(z.string()).optional(),
  }),
});

export const updateNoteSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    rawContent: z.string().optional(),
    aiSummary: z.string().optional(),
    aiKeyPoints: z.array(z.string()).optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const noteIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const listNotesSchema = z.object({
  query: z.object({
    category: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1).optional(),
    limit: z.coerce.number().int().positive().max(100).default(20).optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('updatedAt').optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
  }),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>['body'];
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>['body'];
export type ListNotesQuery = z.infer<typeof listNotesSchema>['query'];
