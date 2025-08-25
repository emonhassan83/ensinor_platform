import express from 'express';
import { UserController } from './user.controller';
import validateRequest from '../../middlewares/validateRequest';
import { UserValidation } from './user.validations';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';

const router = express.Router();

router.get('/', auth(UserRole.super_admin), UserController.getAllUser);

router.get('/me', auth(UserRole.super_admin), UserController.getMyProfile);

router.post(
  '/create-admin',
  auth(UserRole.super_admin),
  validateRequest(UserValidation.createAdmin),
  UserController.createAdmin,
);

router.post(
  '/create-receptionist',
  auth(UserRole.super_admin),
  validateRequest(UserValidation.createReceptionist),
  UserController.createReceptionist,
);

router.post(
  '/create-doctor',
  validateRequest(UserValidation.createDoctor),
  auth(UserRole.super_admin),
  UserController.createDoctor,
);

router.post(
  '/create-patient',
  // auth(UserRole.super_admin),
  validateRequest(UserValidation.createPatient),
  UserController.createPatient,
);

router.patch(
  '/:id/status',
  auth(UserRole.super_admin),
  validateRequest(UserValidation.updateStatus),
  UserController.changeProfileStatus,
);

router.patch(
  '/update-my-profile',
auth(UserRole.super_admin),
  UserController.updateMyProfile,
);

export const userRoutes = router;
