import express from 'express';
import { AffiliateController } from './affiliates.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { AffiliateValidation } from './affiliates.validation';

const router = express.Router();

router.post(
  '/',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.instructor,
  ),
  validateRequest(AffiliateValidation.createValidationSchema),
  AffiliateController.insertIntoDB,
);

router.post(
  '/account',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.instructor
  ),
  validateRequest(AffiliateValidation.affiliateAccountSchema),
  AffiliateController.createAffiliatesAccount,
);

router.get(
  '/account',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.instructor
  ),
  AffiliateController.getAffiliatesAccount,
);

router.get(
  '/affiliate-link/:affiliateId',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.employee,
    UserRole.instructor,
    UserRole.student,
  ),
  AffiliateController.getMyAffiliateFromDB,
);

router.get('/:id', AffiliateController.getByIdFromDB);

router.put(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.instructor,
  ),
  AffiliateController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.instructor,
  ),
  AffiliateController.deleteFromDB,
);

export const AffiliateRoutes = router;
