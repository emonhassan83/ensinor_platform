import express from 'express';
import { AffiliateSaleController } from './affiliateSales.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { AffiliateSaleValidation } from './affiliateSales.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(AffiliateSaleValidation.createValidationSchema),
  AffiliateSaleController.insertIntoDB,
);

router.get(
  '/order/:orderId',
  auth(UserRole.super_admin),
  AffiliateSaleController.getAllByCourseFromDB,
);

router.get(
  '/user/my-affiliateSale',
  auth(UserRole.super_admin),
  AffiliateSaleController.getMyAffiliateFromDB,
);

router.get('/:id', AffiliateSaleController.getByIdFromDB);


router.delete(
  '/:id',
  auth(UserRole.super_admin),
  AffiliateSaleController.deleteFromDB,
);

export const AffiliateSaleRoutes = router;
