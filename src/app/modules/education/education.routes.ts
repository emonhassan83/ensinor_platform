import express from 'express';
import { EducationController } from './education.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { EducationValidation } from './education.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(EducationValidation.createValidationSchema),
  EducationController.insertIntoDB,
);

router.get(
  '/:cvId',
  auth(UserRole.super_admin),
  EducationController.getAllFromDB,
);

router.get('/:id', EducationController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(EducationValidation.updateValidationSchema),
  EducationController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin),
  EducationController.deleteFromDB,
);

export const EducationRoutes = router;
