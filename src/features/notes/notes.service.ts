import { prisma } from '../../config/database';
import { ApiError } from '../../utils/api-error';
import type { CreateNoteInput, UpdateNoteInput, ListNotesQuery } from './notes.schema';
import { Prisma } from '@prisma/client';

export class NotesService {
  async create(userId: string, input: CreateNoteInput) {
    const { tags, ...data } = input;

    const note = await prisma.note.create({
      data: {
        ...data,
        aiKeyPoints: [],
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

    return note;
  }

  async findAll(userId: string, query: ListNotesQuery) {
    const {
      category,
      search,
      page = 1,
      limit = 20,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.NoteWhereInput = {
      userId,
      ...(category && { category }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { rawContent: { contains: search, mode: 'insensitive' } },
          { aiSummary: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        include: { tags: true },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.note.count({ where }),
    ]);

    return {
      notes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(userId: string, id: string) {
    const note = await prisma.note.findFirst({
      where: { id, userId },
      include: {
        tags: true,
        aiConversations: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!note) {
      throw ApiError.notFound('Note not found');
    }

    return note;
  }

  async update(userId: string, id: string, input: UpdateNoteInput) {
    await this.findById(userId, id);

    const { tags, ...data } = input;

    const updateData: Prisma.NoteUpdateInput = { ...data };

    if (tags) {
      updateData.tags = {
        set: [],
        connectOrCreate: tags.map((name) => ({
          where: { name },
          create: { name },
        })),
      };
    }

    return prisma.note.update({
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
    await prisma.note.delete({ where: { id } });
  }
}

export const notesService = new NotesService();
