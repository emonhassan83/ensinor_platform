import express from 'express';
import { CompanyRequestController } from './companyRequest.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CompanyRequestValidation } from './companyRequest.validation';

const router = express.Router();

router.post(
  '/',
  auth(
    UserRole.student,
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.employee,
  ),
  validateRequest(CompanyRequestValidation.createValidationSchema),
  CompanyRequestController.insertIntoDB,
);

router.get(
  '/',
  auth(UserRole.super_admin),
  CompanyRequestController.getAllFromDB,
);

router.get(
  '/:id',
  auth(UserRole.super_admin),
  CompanyRequestController.getByIdFromDB,
);

router.put(
  '/:id',
  auth(
    UserRole.student,
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.employee,
  ),
  validateRequest(CompanyRequestValidation.updateValidationSchema),
  CompanyRequestController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(
    UserRole.student,
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.employee,
  ),
  CompanyRequestController.deleteFromDB,
);

export const CompanyRequestRoutes = router;
