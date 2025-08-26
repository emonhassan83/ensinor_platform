import { Router } from 'express';
import { otpControllers } from './otp.controller';
import { resentOtpValidations } from './otp.validation';
import validateRequest from '../../middlewares/validateRequest';
const router = Router();

router.post(
  '/verify-otp',
  validateRequest(resentOtpValidations.verifyOtpZodSchema),
  otpControllers.verifyOtp,
);

router.post(
  '/resend-otp',
  validateRequest(resentOtpValidations.resentOtpZodSchema),
  otpControllers.resendOtp,
);

export const otpRoutes = router;