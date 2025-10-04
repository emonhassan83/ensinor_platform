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

router.get('/author-courses/:authorId', CourseController.getByAuthorId);

router.get('/popular', CourseController.getPopularCourses);

router.get('/', CourseController.getAllFromDB);

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

router.get('/:id', CourseController.getByIdFromDB);

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
