import { Router } from 'express';
import { remindersController } from './reminders.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createReminderSchema,
  updateReminderSchema,
  reminderIdSchema,
  listRemindersSchema,
  snoozeSchema,
} from './reminders.schema';

const router = Router();

// All reminder routes require authentication
router.use(authMiddleware);

router.post('/', validate(createReminderSchema), remindersController.create);
router.get('/', validate(listRemindersSchema), remindersController.findAll);
router.get('/:id', validate(reminderIdSchema), remindersController.findById);
router.patch('/:id', validate(updateReminderSchema), remindersController.update);
router.delete('/:id', validate(reminderIdSchema), remindersController.delete);
router.post('/:id/complete', validate(reminderIdSchema), remindersController.complete);
router.post('/:id/snooze', validate(snoozeSchema), remindersController.snooze);

export default router;
