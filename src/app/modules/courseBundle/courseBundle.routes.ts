import express from 'express';
import { CourseBundleController } from './courseBundle.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CourseBundleValidation } from './courseBundle.validation';
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
  upload.single('image'),
  parseData(),
  validateRequest(CourseBundleValidation.createValidationSchema),
  CourseBundleController.insertIntoDB,
);

router.get('/', CourseBundleController.getAllFromDB);

router.get(
  '/author/my-bundle-course',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  checkCompanyAdminSubscription(),
  CourseBundleController.getMyCourseFromDB,
);

router.get(
  '/company/:companyId',
  auth(UserRole.company_admin),
  checkCompanyAdminSubscription(),
  CourseBundleController.getByCompanyFromDB,
);

router.get('/:id', CourseBundleController.getByIdFromDB);

router.put(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  checkCompanyAdminSubscription(),
  upload.single('image'),
  parseData(),
  validateRequest(CourseBundleValidation.updateValidationSchema),
  CourseBundleController.updateIntoDB,
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
  CourseBundleController.deleteFromDB,
);

export const CourseBundleRoutes = router;
