import { z } from 'zod';

export const createReminderSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200),
    rawInput: z.string().min(1, 'Input is required'),
    remindAt: z.string().datetime('Invalid datetime format'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    recurrence: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const updateReminderSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    rawInput: z.string().optional(),
    aiSummary: z.string().optional(),
    category: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    status: z.enum(['PENDING', 'COMPLETED', 'SNOOZED', 'CANCELLED']).optional(),
    remindAt: z.string().datetime().optional(),
    recurrence: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const reminderIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const listRemindersSchema = z.object({
  query: z.object({
    status: z.enum(['PENDING', 'COMPLETED', 'SNOOZED', 'CANCELLED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    category: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1).optional(),
    limit: z.coerce.number().int().positive().max(100).default(20).optional(),
    sortBy: z.enum(['createdAt', 'remindAt', 'priority']).default('remindAt').optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc').optional(),
  }),
});

export const snoozeSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    snoozeUntil: z.string().datetime('Invalid datetime format'),
  }),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>['body'];
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>['body'];
export type ListRemindersQuery = z.infer<typeof listRemindersSchema>['query'];
