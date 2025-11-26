import express from 'express';
import { CourseContentController } from './courseContent.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CourseContentValidation } from './courseContent.validation';
import checkCompanyAdminSubscription from '../../middlewares/checkCompanySubscription';

const router = express.Router();

router.post(
  '/',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  checkCompanyAdminSubscription(),
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
  checkCompanyAdminSubscription(),
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
  checkCompanyAdminSubscription(),
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
  checkCompanyAdminSubscription(),
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
  checkCompanyAdminSubscription(),
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
  checkCompanyAdminSubscription(),
  CourseContentController.deleteFromDB,
);

export const CourseContentRoutes = router;
