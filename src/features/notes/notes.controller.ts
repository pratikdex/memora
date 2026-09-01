import { Response } from 'express';
import { notesService } from './notes.service';
import { asyncHandler } from '../../utils/async-handler';
import type { AuthRequest } from '../../middleware/auth.middleware';

export class NotesController {
  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const note = await notesService.create(req.userId!, req.body);
    res.status(201).json({
      success: true,
      data: note,
    });
  });

  findAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await notesService.findAll(req.userId!, req.query as any);
    res.json({
      success: true,
      data: result,
    });
  });

  findById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const note = await notesService.findById(req.userId!, req.params.id as string);
    res.json({
      success: true,
      data: note,
    });
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const note = await notesService.update(req.userId!, req.params.id as string, req.body);
    res.json({
      success: true,
      data: note,
    });
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    await notesService.delete(req.userId!, req.params.id as string);
    res.status(204).send();
  });
}

export const notesController = new NotesController();
