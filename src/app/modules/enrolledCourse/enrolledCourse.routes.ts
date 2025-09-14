import express from 'express';
import { EnrolledCourseController } from './enrolledCourse.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { EnrolledCourseValidation } from './enrolledCourse.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.student, UserRole.employee),
  validateRequest(EnrolledCourseValidation.createValidationSchema),
  EnrolledCourseController.insertIntoDB,
);

router.get(
  '/user/my-enrolled-courses',
  auth(UserRole.student, UserRole.employee),
  EnrolledCourseController.getByQuizIdFromDB,
);

router.get(
  '/:id',
  auth(UserRole.student, UserRole.employee),
  EnrolledCourseController.getByIdFromDB,
);

router.patch(
  '/mark-complete/:id',
  auth(UserRole.student, UserRole.employee),
  EnrolledCourseController.completeCourseIntoDB,
);

router.put(
  '/:id',
  auth(UserRole.student, UserRole.employee),
  validateRequest(EnrolledCourseValidation.updateValidationSchema),
  EnrolledCourseController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.student, UserRole.employee),
  EnrolledCourseController.deleteFromDB,
);

export const EnrolledCourseRoutes = router;
