import express from 'express';
import { QuizAnswerController } from './quizAnswer.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { QuizAnswerValidation } from './quizAnswer.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.student, UserRole.employee),
  validateRequest(QuizAnswerValidation.createValidationSchema),
  QuizAnswerController.insertIntoDB,
);

router.patch(
  '/completed/:id',
  auth(UserRole.student, UserRole.employee),
  QuizAnswerController.completeAttemptIntoDB,
);

router.get(
  '/attempt/:attemptId',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
    UserRole.student,
    UserRole.employee,
  ),
  QuizAnswerController.getByAttemptIdFromDB,
);

router.get(
  '/:id',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
    UserRole.employee,
    UserRole.student,
  ),
  QuizAnswerController.getByIdFromDB,
);

router.put(
  '/:id',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
    UserRole.employee,
    UserRole.student,
  ),
  validateRequest(QuizAnswerValidation.updateValidationSchema),
  QuizAnswerController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
    UserRole.employee,
    UserRole.student,
  ),
  QuizAnswerController.deleteFromDB,
);

export const QuizAnswerRoutes = router;
