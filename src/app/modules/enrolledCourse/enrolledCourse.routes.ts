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

router.post(
  '/bundle-courses',
  auth(UserRole.student, UserRole.employee),
  validateRequest(EnrolledCourseValidation.bulkEnrollValidationSchema),
  EnrolledCourseController.bulkInsertIntoDB,
);

router.get(
  '/student-by-author-course/:authorId',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  EnrolledCourseController.getStudentByAuthorCourse,
);

router.get(
  '/author/my-enrolled-courses',
  auth(UserRole.student, UserRole.employee),
  EnrolledCourseController.getMyFromDB,
);

router.get(
  '/my-enrolled-courses-grade',
  auth(UserRole.student, UserRole.employee),
  EnrolledCourseController.myEnrolledCoursesGrade,
);

router.get(
  '/:id',
  auth(UserRole.student, UserRole.employee),
  EnrolledCourseController.getByIdFromDB,
);

router.patch(
  '/complete/:id',
  auth(UserRole.student, UserRole.employee),
  EnrolledCourseController.completeCourseIntoDB,
);

router.put(
  '/watch-lecture',
  auth(UserRole.student, UserRole.employee),
  validateRequest(EnrolledCourseValidation.watchLectureValidationSchema),
  EnrolledCourseController.watchLecture,
);

router.put(
  '/:id',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(EnrolledCourseValidation.updateValidationSchema),
  EnrolledCourseController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.student, UserRole.employee),
  EnrolledCourseController.deleteFromDB,
);

export const EnrolledCourseRoutes = router;
