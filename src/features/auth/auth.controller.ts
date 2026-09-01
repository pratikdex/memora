import { Request, Response } from 'express';
import { authService } from './auth.service';
import { asyncHandler } from '../../utils/async-handler';
import type { AuthRequest } from '../../middleware/auth.middleware';

export class AuthController {
  register = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    res.status(201).json({
      success: true,
      data: result,
    });
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    res.json({
      success: true,
      data: result,
    });
  });

  getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await authService.getProfile(req.userId!);
    res.json({
      success: true,
      data: user,
    });
  });
}

export const authController = new AuthController();
