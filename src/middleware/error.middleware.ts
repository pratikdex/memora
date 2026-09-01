import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { Prisma } from '@prisma/client';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle known operational errors
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        statusCode: err.statusCode,
      },
    });
    return;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[])?.join(', ') || 'field';
        res.status(409).json({
          success: false,
          error: {
            message: `A record with this ${target} already exists`,
            statusCode: 409,
          },
        });
        return;
      }
      case 'P2025':
        res.status(404).json({
          success: false,
          error: {
            message: 'Record not found',
            statusCode: 404,
          },
        });
        return;
    }
  }

  // Log unexpected errors
  logger.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: {
      message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      statusCode: 500,
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}
