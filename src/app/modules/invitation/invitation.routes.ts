import express from 'express';
import { InvitationController } from './invitation.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { InvitationValidation } from './invitation.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.company_admin),
  validateRequest(InvitationValidation.createValidationSchema),
  InvitationController.insertIntoDB,
);

router.post(
  '/bulk-insert',
  auth(UserRole.company_admin),
  validateRequest(InvitationValidation.bulkCreateValidationSchema),
  InvitationController.bulkInsertIntoDB,
);

router.get(
  '/',
  auth(UserRole.super_admin, UserRole.company_admin),
  InvitationController.getAllFromDB,
);

router.get(
  '/:id',
  auth(UserRole.company_admin),
  InvitationController.getByIdFromDB,
);

router.put(
  '/:id',
  auth(UserRole.company_admin),
  validateRequest(InvitationValidation.updateValidationSchema),
  InvitationController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.company_admin),
  InvitationController.deleteFromDB,
);

export const InvitationRoutes = router;
