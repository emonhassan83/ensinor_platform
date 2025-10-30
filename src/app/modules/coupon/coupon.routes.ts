import express from 'express';
import { CouponController } from './coupon.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CouponValidation } from './coupon.validation';

const router = express.Router();

router.post(
  '/',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(CouponValidation.createValidationSchema),
  CouponController.insertIntoDB,
);

router.get(
  '/global-coupon',
  auth(UserRole.super_admin),
  CouponController.getGlobalCoupon,
);

router.get(
  '/my-coupon',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  CouponController.getMyCouponsFromDB,
);

router.get('/', CouponController.getAllFromDB);

router.get('/:id', CouponController.getByIdFromDB);

router.patch(
  '/status/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  CouponController.changedActiveStatus,
);

router.put(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(CouponValidation.updateValidationSchema),
  CouponController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  CouponController.deleteFromDB,
);

export const CouponRoutes = router;
