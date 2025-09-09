import express from 'express';
import { QuestionController } from './question.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { QuestionValidation } from './question.validation';

const router = express.Router();

router.post(
  '/',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(QuestionValidation.createValidationSchema),
  QuestionController.insertIntoDB,
);

router.post(
  '/options',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(QuestionValidation.optionCreateSchema),
  QuestionController.addOptionsToQuestion,
);

router.get('/quiz/:quizId', QuestionController.getByQuizIdFromDB);

router.get('/:id', QuestionController.getByIdFromDB);

router.get('/question/:questionId', QuestionController.getOptionsByQuestionId);

router.put(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(QuestionValidation.updateValidationSchema),
  QuestionController.updateIntoDB,
);

router.put(
  '/options/:optionId',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(QuestionValidation.optionUpdateSchema),
  QuestionController.updateOption,
);

router.delete(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  QuestionController.deleteFromDB,
);

router.delete(
  '/options/:optionId',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  QuestionController.deleteOption,
);

export const QuestionRoutes = router;
