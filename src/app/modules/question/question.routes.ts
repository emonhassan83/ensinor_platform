import express from 'express';
import { QuestionController } from './question.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { QuestionValidation } from './question.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(QuestionValidation.createValidationSchema),
  QuestionController.insertIntoDB,
);

router.post(
  '/options',
  auth(UserRole.super_admin),
  validateRequest(QuestionValidation.optionCreateSchema),
  QuestionController.insertIntoDB,
);

router.get(
  '/:quizId',
  auth(UserRole.super_admin),
  QuestionController.getByQuizIdFromDB,
);

router.get('/:id', QuestionController.getByIdFromDB);

router.get('/options/:questionId', QuestionController.getOptionsByQuestionId);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(QuestionValidation.updateValidationSchema),
  QuestionController.updateIntoDB,
);

router.put(
  '/options/:id',
  auth(UserRole.super_admin),
  validateRequest(QuestionValidation.optionUpdateSchema),
  QuestionController.updateOption,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin),
  QuestionController.deleteFromDB,
);

router.delete(
  '/options/:optionId',
  auth(UserRole.super_admin),
  QuestionController.deleteOption,
);

export const QuestionRoutes = router;
