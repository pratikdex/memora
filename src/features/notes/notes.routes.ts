import { Router } from 'express';
import { notesController } from './notes.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createNoteSchema,
  updateNoteSchema,
  noteIdSchema,
  listNotesSchema,
} from './notes.schema';

const router = Router();

// All note routes require authentication
router.use(authMiddleware);

router.post('/', validate(createNoteSchema), notesController.create);
router.get('/', validate(listNotesSchema), notesController.findAll);
router.get('/:id', validate(noteIdSchema), notesController.findById);
router.patch('/:id', validate(updateNoteSchema), notesController.update);
router.delete('/:id', validate(noteIdSchema), notesController.delete);

export default router;
