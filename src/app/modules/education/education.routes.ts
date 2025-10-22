import express from 'express';
import { EducationController } from './education.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { EducationValidation } from './education.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.student, UserRole.employee),
  validateRequest(EducationValidation.createValidationSchema),
  EducationController.insertIntoDB,
);

router.get(
  '/cv/:cvId',
  auth(UserRole.student, UserRole.employee),
  EducationController.getAllFromDB,
);

router.get(
  '/:id',
  auth(UserRole.student, UserRole.employee),
  EducationController.getByIdFromDB,
);

router.put(
  '/:id',
  auth(UserRole.student, UserRole.employee),
  validateRequest(EducationValidation.updateValidationSchema),
  EducationController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.student, UserRole.employee),
  EducationController.deleteFromDB,
);

export const EducationRoutes = router;
