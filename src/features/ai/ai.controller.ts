import { Response } from 'express';
import { aiService } from './ai.service';
import { asyncHandler } from '../../utils/async-handler';
import type { AuthRequest } from '../../middleware/auth.middleware';

export class AIController {
  /**
   * POST /api/ai/ask
   * Get AI follow-up questions for a reminder or note input.
   */
  ask = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await aiService.askQuestions(req.userId!, req.body);
    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * POST /api/ai/answer
   * Submit answers to AI questions. Optionally generates a summary.
   */
  answer = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await aiService.processAnswers(req.userId!, req.body);
    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * POST /api/ai/summarize
   * Generate a summary from conversation history.
   */
  summarize = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await aiService.summarize(req.userId!, req.body);
    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * POST /api/ai/categorize
   * Auto-categorize input and suggest tags.
   */
  categorize = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await aiService.categorize(req.body.input);
    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * POST /api/ai/enhance-note
   * Enhance a note with AI-generated insights.
   */
  enhanceNote = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await aiService.enhanceNote(req.userId!, req.body);
    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * GET /api/ai/conversation/:id
   * Get AI conversation history for a reminder or note.
   */
  getConversation = asyncHandler(async (req: AuthRequest, res: Response) => {
    const type = req.query.type as string as 'reminder' | 'note';
    const conversation = await aiService.getConversation(
      req.userId!,
      req.params.id as string,
      type
    );
    res.json({
      success: true,
      data: conversation,
    });
  });
}

export const aiController = new AIController();
