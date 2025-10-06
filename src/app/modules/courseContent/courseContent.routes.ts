import express from 'express';
import { CourseContentController } from './courseContent.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CourseContentValidation } from './courseContent.validation';
import parseData from '../../middlewares/parseData';
import multer, { memoryStorage } from 'multer';
import checkCompanyAdminSubscription from '../../middlewares/checkCompanySubscription';

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
  checkCompanyAdminSubscription(),
  upload.single('content'),
  parseData(),
  validateRequest(CourseContentValidation.createValidationSchema),
  CourseContentController.insertIntoDB,
);

router.get('/course/:courseId', CourseContentController.getByCourseIdFromDB);

router.get('/:id', CourseContentController.getByIdFromDB);

router.put(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  checkCompanyAdminSubscription(),
  upload.single('content'),
  parseData(),
  validateRequest(CourseContentValidation.updateValidationSchema),
  CourseContentController.updateIntoDB,
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
