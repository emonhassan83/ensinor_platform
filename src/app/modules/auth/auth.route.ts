import express from 'express';
import { AuthControllers } from './auth.controller';
import { AuthValidation } from './auth.validation';
import multer, { memoryStorage } from 'multer';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';

const router = express.Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.post(
  '/login',
  validateRequest(AuthValidation.loginValidationSchema),
  AuthControllers.loginUser,
);

router.post(
  '/google',
  validateRequest(AuthValidation.googleZodValidationSchema),
  AuthControllers.registerWithGoogle,
);

router.post(
  '/linkedin',
  validateRequest(AuthValidation.linkedinZodValidationSchema),
  AuthControllers.registerWithLinkedIn,
);

router.post(
  '/facebook',
  validateRequest(AuthValidation.facebookZodValidationSchema),
  AuthControllers.registerWithFacebook,
);

router.post(
  '/change-password',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.employee,
    UserRole.instructor,
    UserRole.student,
  ),
  validateRequest(AuthValidation.changePasswordValidationSchema),
  AuthControllers.changePassword,
);

router.post(
  '/refresh-token',
  // validateRequest(AuthValidation.refreshTokenValidationSchema),
  AuthControllers.refreshToken,
);

router.post(
  '/forget-password',
  validateRequest(AuthValidation.forgetPasswordValidationSchema),
  AuthControllers.forgetPassword,
);

router.post(
  '/reset-password',
  validateRequest(AuthValidation.resetPasswordValidationSchema),
  AuthControllers.resetPassword,
);

export const AuthRoutes = router;
