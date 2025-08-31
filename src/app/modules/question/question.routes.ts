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


router.get(
  '/:quizId',
  auth(UserRole.super_admin),
  QuestionController.getByQuizIdFromDB,
);

router.get('/:id', QuestionController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(QuestionValidation.updateValidationSchema),
  QuestionController.updateIntoDB,
);

router.delete('/:id', auth(UserRole.super_admin), QuestionController.deleteFromDB);

export const QuestionRoutes = router;
