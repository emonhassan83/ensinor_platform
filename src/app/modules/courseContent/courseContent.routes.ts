import express from 'express';
import { CourseContentController } from './courseContent.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CourseContentValidation } from './courseContent.validation';

const router = express.Router();

router.post(
  '/',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(CourseContentValidation.createSectionValidationSchema),
  CourseContentController.insertIntoDB,
);

router.post(
  '/add-lesson',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(CourseContentValidation.createLessonValidationSchema),
  CourseContentController.addLessonIntoDB,
);

router.get('/course/:courseId', CourseContentController.getByCourseIdFromDB);

router.put(
  '/lesson/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(CourseContentValidation.updateLessonValidationSchema),
  CourseContentController.updateLessonFromDB,
);

router.put(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(CourseContentValidation.updateSectionValidationSchema),
  CourseContentController.updateIntoDB,
);

router.delete(
  '/lesson/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  CourseContentController.deleteLessonFromDB,
);

router.delete(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  CourseContentController.deleteFromDB,
);

export const CourseContentRoutes = router;
