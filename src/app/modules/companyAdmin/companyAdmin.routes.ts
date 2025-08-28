import express from 'express';
import { CompanyAdminController } from './companyAdmin.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CompanyAdminValidation } from './companyAdmin.validation';

const router = express.Router();

router.get('/', CompanyAdminController.getAllFromDB);

router.get('/:id', auth(UserRole.super_admin), CompanyAdminController.getByIdFromDB);

router.patch(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin),
  validateRequest(CompanyAdminValidation.updateValidationSchema),
  CompanyAdminController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin),
  CompanyAdminController.deleteFromDB,
);

export const CompanyAdminRoutes = router;
