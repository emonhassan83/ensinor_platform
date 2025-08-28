import express from 'express';
import { EmployeeController } from './employee.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { EmployeeValidation } from './employee.validation';

const router = express.Router();

router.get('/', EmployeeController.getAllFromDB);

router.get(
  '/:id',
  auth(UserRole.super_admin),
  EmployeeController.getByIdFromDB,
);

router.patch(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin),
  validateRequest(EmployeeValidation.updateValidationSchema),
  EmployeeController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin),
  EmployeeController.deleteFromDB,
);

export const EmployeeRoutes = router;
