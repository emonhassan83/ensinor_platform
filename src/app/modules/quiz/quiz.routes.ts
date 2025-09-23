import express from 'express';
import { QuizController } from './quiz.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { QuizValidation } from './quiz.validation';

const router = express.Router();

router.post(
  '/',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(QuizValidation.createValidationSchema),
  QuizController.insertIntoDB,
);

router.get(
  '/author/my-quizzes',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  QuizController.getByAuthorIdFromDB,
);

router.get('/course/:courseId', QuizController.getByCourseIdFromDB);

router.get('/:id', QuizController.getByIdFromDB);

router.put(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(QuizValidation.updateValidationSchema),
  QuizController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  QuizController.deleteFromDB,
);

export const QuizRoutes = router;
