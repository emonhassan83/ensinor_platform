import express from 'express';
import { CompanyRequestController } from './companyRequest.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CompanyRequestValidation } from './companyRequest.validation';

const router = express.Router();

router.post('/', auth(UserRole.student), CompanyRequestController.insertIntoDB);

router.get(
  '/',
  auth(UserRole.super_admin, UserRole.student),
  CompanyRequestController.getAllFromDB,
);

router.get(
  '/:id',
  auth(UserRole.super_admin),
  CompanyRequestController.getByIdFromDB,
);

router.put(
  '/:id',
  auth(UserRole.super_admin, UserRole.student),
  validateRequest(CompanyRequestValidation.updateValidationSchema),
  CompanyRequestController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin, UserRole.student),
  CompanyRequestController.deleteFromDB,
);

export const CompanyRequestRoutes = router;
