import express from 'express';
import { QuizController } from './quiz.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { QuizValidation } from './quiz.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(QuizValidation.createValidationSchema),
  QuizController.insertIntoDB,
);

router.get(
  '/:courseId',
  auth(UserRole.super_admin),
  QuizController.getByCourseIdFromDB,
);

router.get('/:id', QuizController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(QuizValidation.updateValidationSchema),
  QuizController.updateIntoDB,
);

router.delete('/:id', auth(UserRole.super_admin), QuizController.deleteFromDB);

export const QuizRoutes = router;
