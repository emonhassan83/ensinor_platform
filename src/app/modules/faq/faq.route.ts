import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { FaqValidation } from './faq.validations';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { FaqController } from './faq.controller';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin, UserRole.company_admin),
  validateRequest(FaqValidation.createValidationSchema),
  FaqController.insertIntoDB,
);

router.put(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin),
  validateRequest(FaqValidation.updateValidationSchema),
  FaqController.updateIntoDB,
);

router.get('/:id', FaqController.getByIdFromDB);

router.get('/', FaqController.getAllFromDB);

router.delete(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin),
  FaqController.deleteFromDB,
);

export const FaqRoutes = router;
