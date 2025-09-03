import express from 'express';
import { MessageController } from './messages.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { MessageValidation } from './messages.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(MessageValidation.createValidationSchema),
  MessageController.insertIntoDB,
);

router.get('/chat/:chatId', MessageController.getMessagesByChatId);

router.get('/:id', MessageController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(MessageValidation.updateValidationSchema),
  MessageController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin),
  MessageController.deleteFromDB,
);

router.delete(
  '/chat/:chatId',
  auth(UserRole.super_admin),
  MessageController.deleteMessagesByChatId,
);

export const MessageRoutes = router;
