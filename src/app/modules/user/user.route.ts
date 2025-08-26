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
  '/create-company-admin',
  auth(UserRole.super_admin),
  validateRequest(UserValidation.createCompanyAdmin),
  UserController.createCompanyAdmin,
);

router.post(
  '/create-business-instructor',
  auth(UserRole.super_admin),
  validateRequest(UserValidation.createBusinessInstructor),
  UserController.createBusinessInstructor,
);

router.post(
  '/create-employee',
  validateRequest(UserValidation.createEmployee),
  auth(UserRole.super_admin),
  UserController.createEmployee,
);

router.post(
  '/create-instructor',
  auth(UserRole.super_admin),
  validateRequest(UserValidation.createInstructor),
  UserController.createInstructor,
);

router.post(
  '/create-student',
  validateRequest(UserValidation.createStudent),
  UserController.createStudent,
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
