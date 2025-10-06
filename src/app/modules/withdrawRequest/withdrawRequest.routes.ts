import express from 'express';
import { WithdrawRequestController } from './withdrawRequest.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { WithdrawRequestValidation } from './withdrawRequest.validation';
import checkCompanyAdminSubscription from '../../middlewares/checkCompanySubscription';

const router = express.Router();

router.post(
  '/',
  auth(
    UserRole.company_admin,
    UserRole.instructor,
    UserRole.business_instructors,
  ),
  checkCompanyAdminSubscription(),
  validateRequest(WithdrawRequestValidation.createValidationSchema),
  WithdrawRequestController.insertIntoDB,
);

router.get(
  '/author/my-payout',
  auth(
    UserRole.company_admin,
    UserRole.instructor,
    UserRole.business_instructors,
  ),
  checkCompanyAdminSubscription(),
  WithdrawRequestController.getAuthorPayout,
);

router.get(
  '/co-instructor/my-payout',
  auth(UserRole.instructor, UserRole.business_instructors),
  WithdrawRequestController.getCoInstructorPayout,
);

router.get(
  '/',
  auth(UserRole.super_admin),
  WithdrawRequestController.getAllFromDB,
);

router.get(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.instructor,
    UserRole.business_instructors,
  ),
  checkCompanyAdminSubscription(),
  WithdrawRequestController.getByIdFromDB,
);

router.patch(
  '/status/:id',
  auth(UserRole.super_admin),
  validateRequest(WithdrawRequestValidation.updateValidationSchema),
  WithdrawRequestController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.instructor,
    UserRole.business_instructors,
  ),
  checkCompanyAdminSubscription(),
  WithdrawRequestController.deleteFromDB,
);

export const WithdrawRequestRoutes = router;
