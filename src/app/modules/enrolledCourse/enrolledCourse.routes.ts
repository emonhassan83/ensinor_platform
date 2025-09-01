import express from 'express';
import { EnrolledCourseController } from './enrolledCourse.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { EnrolledCourseValidation } from './enrolledCourse.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(EnrolledCourseValidation.createValidationSchema),
  EnrolledCourseController.insertIntoDB,
);

router.get(
  '/:quizId',
  auth(UserRole.super_admin),
  EnrolledCourseController.getByQuizIdFromDB,
);

router.get('/:id', EnrolledCourseController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(EnrolledCourseValidation.updateValidationSchema),
  EnrolledCourseController.updateIntoDB,
);

router.delete('/:id', auth(UserRole.super_admin), EnrolledCourseController.deleteFromDB);

export const EnrolledCourseRoutes = router;
