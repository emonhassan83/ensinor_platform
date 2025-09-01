import express from 'express';
import { QuizAttemptController } from './quizAttempt.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { QuizAttemptValidation } from './quizAttempt.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(QuizAttemptValidation.createValidationSchema),
  QuizAttemptController.insertIntoDB,
);

router.get(
  '/:quizId',
  auth(UserRole.super_admin),
  QuizAttemptController.getByQuizIdFromDB,
);

router.get('/:id', QuizAttemptController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(QuizAttemptValidation.updateValidationSchema),
  QuizAttemptController.updateIntoDB,
);

router.delete('/:id', auth(UserRole.super_admin), QuizAttemptController.deleteFromDB);

export const QuizAttemptRoutes = router;
