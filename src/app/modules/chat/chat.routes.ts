import express from 'express';
import { ChatController } from './chat.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { ChatValidation } from './chat.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(ChatValidation.createValidationSchema),
  ChatController.insertIntoDB,
);

router.get('/my-chat-list', ChatController.getAllFromDB);

router.get('/:id', ChatController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(ChatValidation.updateValidationSchema),
  ChatController.updateIntoDB,
);

router.delete('/:id', auth(UserRole.super_admin), ChatController.deleteFromDB);

export const ChatRoutes = router;
