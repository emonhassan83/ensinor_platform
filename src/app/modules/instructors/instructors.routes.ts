import express from 'express';
import { InstructorController } from './instructors.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { InstructorValidation } from './instructors.validation';

const router = express.Router();

router.get('/', InstructorController.getAllFromDB);

router.get(
  '/:id',
  InstructorController.getByIdFromDB,
);

router.put(
  '/:id',
  auth(UserRole.super_admin, UserRole.instructor),
  validateRequest(InstructorValidation.updateValidationSchema),
  InstructorController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin, UserRole.instructor),
  InstructorController.deleteFromDB,
);

export const InstructorRoutes = router;
