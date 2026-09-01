import { Router } from 'express';
import { aiController } from './ai.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  askQuestionsSchema,
  answerSchema,
  summarizeSchema,
  categorizeSchema,
  enhanceNoteSchema,
  conversationIdSchema,
} from './ai.schema';

const router = Router();

// All AI routes require authentication
router.use(authMiddleware);

router.post('/ask', validate(askQuestionsSchema), aiController.ask);
router.post('/answer', validate(answerSchema), aiController.answer);
router.post('/summarize', validate(summarizeSchema), aiController.summarize);
router.post('/categorize', validate(categorizeSchema), aiController.categorize);
router.post('/enhance-note', validate(enhanceNoteSchema), aiController.enhanceNote);
router.get('/conversation/:id', validate(conversationIdSchema), aiController.getConversation);

export default router;
