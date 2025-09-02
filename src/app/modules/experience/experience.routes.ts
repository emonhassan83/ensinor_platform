import express from 'express';
import { ExperienceController } from './experience.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { ExperienceValidation } from './experience.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(ExperienceValidation.createValidationSchema),
  ExperienceController.insertIntoDB,
);

router.get(
  '/:cvId',
  auth(UserRole.super_admin),
  ExperienceController.getAllFromDB,
);

router.get('/:id', ExperienceController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(ExperienceValidation.updateValidationSchema),
  ExperienceController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin),
  ExperienceController.deleteFromDB,
);

export const ExperienceRoutes = router;
