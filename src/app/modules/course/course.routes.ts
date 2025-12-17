import express from 'express';
import { CourseController } from './course.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CourseValidation } from './course.validation';
import parseData from '../../middlewares/parseData';
import multer, { memoryStorage } from 'multer';
import { optionalAuth } from '../../middlewares/optionalAuth';

const router = express.Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.post(
  '/',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  upload.single('image'),
  parseData(),
  validateRequest(CourseValidation.createValidationSchema),
  CourseController.insertIntoDB,
);

router.get(
  '/combine-courses',
  optionalAuth(UserRole.student, UserRole.employee),
  CourseController.getCombineCourses,
);

router.get(
  '/internal-courses',
  optionalAuth(UserRole.company_admin),
  CourseController.getMyInternalCourse,
);

router.get('/author-courses/:authorId', CourseController.getByAuthorId);

router.get('/popular', CourseController.getPopularCourses);

router.get('/', CourseController.getAllPlatformCourses);

router.get('/filter-data', CourseController.getAllFilterDataFromDB);

router.get(
  '/company/:companyId',
  auth(UserRole.company_admin),
  CourseController.getByCompanyFromDB,
);

router.get(
  '/author/my-course',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  CourseController.getMyCourseFromDB,
);

router.get(
  '/:id',
  optionalAuth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
    UserRole.student,
    UserRole.employee,
  ),
  CourseController.getByIdFromDB,
);

router.put(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  upload.single('image'),
  parseData(),
  validateRequest(CourseValidation.updateValidationSchema),
  CourseController.updateIntoDB,
);

router.patch(
  '/course-assign/:id',
  auth(UserRole.company_admin),
  validateRequest(CourseValidation.updateValidationSchema),
  CourseController.assignACourse,
);

router.patch(
  '/published/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(CourseValidation.updateValidationSchema),
  CourseController.publishACourse,
);

router.patch(
  '/status/:id',
  auth(UserRole.super_admin, UserRole.company_admin),
  validateRequest(CourseValidation.updateValidationSchema),
  CourseController.changeStatusIntoDB,
);

router.delete(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  CourseController.deleteFromDB,
);

export const CourseRoutes = router;
