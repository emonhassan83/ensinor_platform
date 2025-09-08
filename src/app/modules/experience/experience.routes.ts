import express from 'express';
import { ExperienceController } from './experience.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { ExperienceValidation } from './experience.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.student),
  validateRequest(ExperienceValidation.createValidationSchema),
  ExperienceController.insertIntoDB,
);

router.get('/cv/:cvId', auth(UserRole.student), ExperienceController.getAllFromDB);

router.get('/:id', auth(UserRole.student), ExperienceController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.student),
  validateRequest(ExperienceValidation.updateValidationSchema),
  ExperienceController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.student),
  ExperienceController.deleteFromDB,
);

export const ExperienceRoutes = router;
