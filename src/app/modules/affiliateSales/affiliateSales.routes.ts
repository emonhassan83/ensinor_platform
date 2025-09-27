import express from 'express';
import { AffiliateSaleController } from './affiliateSales.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { AffiliateSaleValidation } from './affiliateSales.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.student, UserRole.employee),
  validateRequest(AffiliateSaleValidation.createValidationSchema),
  AffiliateSaleController.insertIntoDB,
);

router.get(
  '/order/:orderId',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  AffiliateSaleController.getAllByOrderFromDB,
);

router.get(
  '/user/my-affiliate-sale',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  AffiliateSaleController.getMyAffiliateFromDB,
);

router.get('/:id', AffiliateSaleController.getByIdFromDB);

router.delete(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  AffiliateSaleController.deleteFromDB,
);

export const AffiliateSaleRoutes = router;
