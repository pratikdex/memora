import { Response } from 'express';
import { remindersService } from './reminders.service';
import { asyncHandler } from '../../utils/async-handler';
import type { AuthRequest } from '../../middleware/auth.middleware';

export class RemindersController {
  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const reminder = await remindersService.create(req.userId!, req.body);
    res.status(201).json({
      success: true,
      data: reminder,
    });
  });

  findAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await remindersService.findAll(req.userId!, req.query as any);
    res.json({
      success: true,
      data: result,
    });
  });

  findById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const reminder = await remindersService.findById(req.userId!, req.params.id as string);
    res.json({
      success: true,
      data: reminder,
    });
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const reminder = await remindersService.update(req.userId!, req.params.id as string, req.body);
    res.json({
      success: true,
      data: reminder,
    });
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    await remindersService.delete(req.userId!, req.params.id as string);
    res.status(204).send();
  });

  complete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const reminder = await remindersService.complete(req.userId!, req.params.id as string);
    res.json({
      success: true,
      data: reminder,
    });
  });

  snooze = asyncHandler(async (req: AuthRequest, res: Response) => {
    const reminder = await remindersService.snooze(
      req.userId!,
      req.params.id as string,
      req.body.snoozeUntil
    );
    res.json({
      success: true,
      data: reminder,
    });
  });
}

export const remindersController = new RemindersController();
