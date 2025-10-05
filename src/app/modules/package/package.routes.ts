import express from 'express';
import { PackageController } from './package.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { PackageValidation } from './package.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(PackageValidation.createValidationSchema),
  PackageController.insertIntoDB,
);

router.get('/', PackageController.getAllFromDB);

router.get('/:id', PackageController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(PackageValidation.updateValidationSchema),
  PackageController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin),
  PackageController.deleteFromDB,
);

export const PackageRoutes = router;
