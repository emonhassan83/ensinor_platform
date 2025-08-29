import express from 'express';
import { BusinessInstructorController } from './businessInstructor.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { BusinessInstructorValidation } from './businessInstructor.validation';

const router = express.Router();

router.get(
  '/',
  auth(UserRole.super_admin, UserRole.company_admin),
  BusinessInstructorController.getAllFromDB,
);

router.get(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin),
  BusinessInstructorController.getByIdFromDB,
);

router.put(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
  ),
  validateRequest(BusinessInstructorValidation.updateValidationSchema),
  BusinessInstructorController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
  ),
  BusinessInstructorController.deleteFromDB,
);

export const BusinessInstructorRoutes = router;
