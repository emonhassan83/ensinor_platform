import express from 'express';
import { CourseController } from './course.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CourseValidation } from './course.validation';
import parseData from '../../middlewares/parseData';
import multer, { memoryStorage } from 'multer';

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

router.get('/', CourseController.getAllFromDB);

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
  '/instructor/my-course',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  CourseController.getMyInstructorCourse,
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
  '/status/:id',
  auth(UserRole.super_admin),
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
