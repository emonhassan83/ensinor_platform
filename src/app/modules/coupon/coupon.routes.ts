import express from 'express';
import { CouponController } from './coupon.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CouponValidation } from './coupon.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(CouponValidation.createValidationSchema),
  CouponController.insertIntoDB,
);

router.get('/', CouponController.getAllFromDB);

router.get(
  '/reference/:referenceId',
  auth(UserRole.super_admin),
  CouponController.getAllByReferenceFromDB,
);

router.get(
  '/user/my-coupon',
  auth(UserRole.super_admin),
  CouponController.getMyCouponsFromDB,
);

router.get('/:id', CouponController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(CouponValidation.updateValidationSchema),
  CouponController.updateIntoDB,
);

router.delete('/:id', auth(UserRole.super_admin), CouponController.deleteFromDB);

export const CouponRoutes = router;
