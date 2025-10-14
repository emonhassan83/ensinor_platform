import express from 'express';
import { QuizAttemptController } from './quizAttempt.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { QuizAttemptValidation } from './quizAttempt.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.student, UserRole.employee),
  validateRequest(QuizAttemptValidation.createValidationSchema),
  QuizAttemptController.insertIntoDB,
);

router.patch(
  '/completed/:id',
  auth(UserRole.student, UserRole.employee),
  QuizAttemptController.completeAttemptIntoDB,
);

router.get(
  '/quiz/:quizId',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
    UserRole.student
  ),
  QuizAttemptController.getByQuizIdFromDB,
);

router.get(
  '/author/my-quiz-attempt',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  QuizAttemptController.getByAuthorQuizFromDB,
);

router.get(
  '/user/my-quiz-attempt',
  auth(UserRole.student, UserRole.employee),
  QuizAttemptController.getMyAttemptFromDB,
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
  QuizAttemptController.getByIdFromDB,
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
  validateRequest(QuizAttemptValidation.updateValidationSchema),
  QuizAttemptController.updateIntoDB,
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
  QuizAttemptController.deleteFromDB,
);

export const QuizAttemptRoutes = router;
