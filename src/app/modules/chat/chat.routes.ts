import express from 'express';
import { ChatController } from './chat.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { ChatValidation } from './chat.validation';
import multer, { memoryStorage } from 'multer';
import parseData from '../../middlewares/parseData';

const router = express.Router();
const storage = memoryStorage();
const upload = multer({ storage });

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
  validateRequest(ChatValidation.createValidationSchema),
  ChatController.insertIntoDB,
);

router.get(
  '/my-chat-list',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.employee,
    UserRole.instructor,
    UserRole.student,
  ),
  ChatController.getAllFromDB,
);

router.get('/:id', ChatController.getByIdFromDB);

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
  upload.single('image'),
  parseData(),
  validateRequest(ChatValidation.updateValidationSchema),
  ChatController.updateIntoDB,
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
  ChatController.deleteFromDB,
);

export const ChatRoutes = router;
