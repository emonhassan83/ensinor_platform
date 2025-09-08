import express from 'express';
import { EducationController } from './education.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { EducationValidation } from './education.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.student),
  validateRequest(EducationValidation.createValidationSchema),
  EducationController.insertIntoDB,
);

router.get('/cv/:cvId', auth(UserRole.student), EducationController.getAllFromDB);

router.get('/:id', auth(UserRole.student), EducationController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.student),
  validateRequest(EducationValidation.updateValidationSchema),
  EducationController.updateIntoDB,
);

router.delete('/:id', auth(UserRole.student), EducationController.deleteFromDB);

export const EducationRoutes = router;
