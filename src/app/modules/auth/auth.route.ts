import express from 'express'
import validateRequest from '../../middleware/validateRequest'
import { AuthControllers } from './auth.controller'
import { AuthValidation } from './auth.validation'
import auth from '../../middleware/auth'
import { USER_ROLE } from '../User/user.constant'
import multer, { memoryStorage } from 'multer'
import parseData from '../../middleware/parseData'

const router = express.Router()
const storage = memoryStorage()
const upload = multer({ storage })

router.post(
  '/login',
  validateRequest(AuthValidation.loginValidationSchema),
  AuthControllers.loginUser,
)

router.post(
  '/google',
  validateRequest(AuthValidation.googleZodValidationSchema),
  AuthControllers.registerWithGoogle,
)

router.post(
  '/apple',
  validateRequest(AuthValidation.appleZodValidationSchema),
  AuthControllers.registerWithApple,
)

router.post(
  '/facebook',
  validateRequest(AuthValidation.facebookZodValidationSchema),
  AuthControllers.registerWithFacebook,
)

router.post(
  '/change-password',
  auth(USER_ROLE.admin, USER_ROLE.therapist, USER_ROLE.user),
  validateRequest(AuthValidation.changePasswordValidationSchema),
  AuthControllers.changePassword,
)

router.post(
  '/refresh-token',
  // validateRequest(AuthValidation.refreshTokenValidationSchema),
  AuthControllers.refreshToken,
)

router.post(
  '/forget-password',
  validateRequest(AuthValidation.forgetPasswordValidationSchema),
  AuthControllers.forgetPassword,
)

router.post(
  '/reset-password',
  validateRequest(AuthValidation.resetPasswordValidationSchema),
  AuthControllers.resetPassword,
)

export const AuthRoutes = router
