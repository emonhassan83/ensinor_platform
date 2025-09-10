import express from 'express';
import { PromoCodeController } from './promoCode.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { PromoCodeValidation } from './promoCode.validation';

const router = express.Router();

router.post(
  '/',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(PromoCodeValidation.createValidationSchema),
  PromoCodeController.insertIntoDB,
);

router.get('/', PromoCodeController.getAllFromDB);

// router.get(
//   '/reference/:referenceId',
//   auth(
//     UserRole.super_admin,
//     UserRole.company_admin,
//     UserRole.business_instructors,
//     UserRole.instructor,
//   ),
//   PromoCodeController.getAllByReferenceFromDB,
// );

router.get(
  '/user/my-promo-code',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  PromoCodeController.getMyPromoCodesFromDB,
);

router.get('/:id', PromoCodeController.getByIdFromDB);

router.put(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(PromoCodeValidation.updateValidationSchema),
  PromoCodeController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  PromoCodeController.deleteFromDB,
);

export const PromoCodeRoutes = router;
