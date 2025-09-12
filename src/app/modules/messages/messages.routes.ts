import express from 'express';
import { MessageController } from './messages.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { MessageValidation } from './messages.validation';

const router = express.Router();

router.post(
  '/',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.employee,
    UserRole.instructor,
    UserRole.student,
  ),
  validateRequest(MessageValidation.createValidationSchema),
  MessageController.insertIntoDB,
);

router.patch(
  '/seen/:chatId',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.employee,
    UserRole.instructor,
    UserRole.student,
  ),
  MessageController.seenMessage,
);

router.get('/chat/:chatId', MessageController.getMessagesByChatId);

router.get('/:id', MessageController.getByIdFromDB);

router.put(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.employee,
    UserRole.instructor,
    UserRole.student,
  ),
  validateRequest(MessageValidation.updateValidationSchema),
  MessageController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.employee,
    UserRole.instructor,
    UserRole.student,
  ),
  MessageController.deleteFromDB,
);

router.delete(
  '/chat/:chatId',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.employee,
    UserRole.instructor,
    UserRole.student,
  ),
  MessageController.deleteMessagesByChatId,
);

export const MessageRoutes = router;
