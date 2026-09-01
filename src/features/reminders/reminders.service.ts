import { prisma } from '../../config/database';
import { ApiError } from '../../utils/api-error';
import type { CreateReminderInput, UpdateReminderInput, ListRemindersQuery } from './reminders.schema';
import { Prisma } from '@prisma/client';

export class RemindersService {
  async create(userId: string, input: CreateReminderInput) {
    const { tags, ...data } = input;

    const reminder = await prisma.reminder.create({
      data: {
        ...data,
        remindAt: new Date(data.remindAt),
        userId,
        tags: tags?.length
          ? {
              connectOrCreate: tags.map((name) => ({
                where: { name },
                create: { name },
              })),
            }
          : undefined,
      },
      include: {
        tags: true,
        aiConversations: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return reminder;
  }

  async findAll(userId: string, query: ListRemindersQuery) {
    const {
      status,
      priority,
      category,
      search,
      page = 1,
      limit = 20,
      sortBy = 'remindAt',
      sortOrder = 'asc',
    } = query;

    const where: Prisma.ReminderWhereInput = {
      userId,
      ...(status && { status }),
      ...(priority && { priority }),
      ...(category && { category }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { rawInput: { contains: search, mode: 'insensitive' } },
          { aiSummary: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [reminders, total] = await Promise.all([
      prisma.reminder.findMany({
        where,
        include: { tags: true },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.reminder.count({ where }),
    ]);

    return {
      reminders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(userId: string, id: string) {
    const reminder = await prisma.reminder.findFirst({
      where: { id, userId },
      include: {
        tags: true,
        aiConversations: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!reminder) {
      throw ApiError.notFound('Reminder not found');
    }

    return reminder;
  }

  async update(userId: string, id: string, input: UpdateReminderInput) {
    await this.findById(userId, id);

    const { tags, ...data } = input;

    const updateData: Prisma.ReminderUpdateInput = {
      ...data,
      ...(data.remindAt && { remindAt: new Date(data.remindAt) }),
    };

    if (tags) {
      updateData.tags = {
        set: [], // Disconnect all existing tags
        connectOrCreate: tags.map((name) => ({
          where: { name },
          create: { name },
        })),
      };
    }

    return prisma.reminder.update({
      where: { id },
      data: updateData,
      include: {
        tags: true,
        aiConversations: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async delete(userId: string, id: string) {
    await this.findById(userId, id);
    await prisma.reminder.delete({ where: { id } });
  }

  async complete(userId: string, id: string) {
    await this.findById(userId, id);
    return prisma.reminder.update({
      where: { id },
      data: { status: 'COMPLETED' },
      include: { tags: true },
    });
  }

  async snooze(userId: string, id: string, snoozeUntil: string) {
    await this.findById(userId, id);
    return prisma.reminder.update({
      where: { id },
      data: {
        status: 'SNOOZED',
        remindAt: new Date(snoozeUntil),
      },
      include: { tags: true },
    });
  }
}

export const remindersService = new RemindersService();
