import express from 'express';
import { AffiliateController } from './affiliates.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { AffiliateValidation } from './affiliates.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(AffiliateValidation.createValidationSchema),
  AffiliateController.insertIntoDB,
);

router.post(
  '/account',
  validateRequest(AffiliateValidation.affiliateAccountSchema),
  AffiliateController.createAffiliatesAccount,
);

router.get(
  '/account',
  auth(UserRole.super_admin),
  AffiliateController.getAffiliatesAccount,
);

router.get(
  '/affiliate-link/:affiliateId',
  auth(UserRole.super_admin),
  AffiliateController.getMyAffiliateFromDB,
);

router.get('/:id', AffiliateController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  AffiliateController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin),
  AffiliateController.deleteFromDB,
);

export const AffiliateRoutes = router;
