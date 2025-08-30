import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { SupportValidation } from './support.validations';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { SupportController } from './support.controller';

const router = express.Router();

router.post(
  '/',
  validateRequest(SupportValidation.createValidationSchema),
  SupportController.insertIntoDB,
);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(SupportValidation.updateValidationSchema),
  SupportController.updateIntoDB,
);

router.patch(
  '/response/:id',
  auth(UserRole.super_admin),
  SupportController.changeStatusIntoDB,
);

router.get('/:id', SupportController.getByIdFromDB);

router.get('/', SupportController.getAllFromDB);

router.delete(
  '/:id',
  auth(UserRole.super_admin),
  SupportController.deleteFromDB,
);

export const SupportRoutes = router;
