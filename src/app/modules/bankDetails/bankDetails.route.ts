import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { BankDetailsValidation } from './bankDetails.validations';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { BankDetailsController } from './bankDetails.controller';

const router = express.Router();

router.post(
  '/',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(BankDetailsValidation.createValidationSchema),
  BankDetailsController.insertIntoDB,
);

router.put(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(BankDetailsValidation.updateValidationSchema),
  BankDetailsController.updateIntoDB,
);

router.get(
  '/author/my-bank-details',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  BankDetailsController.getAllMyFromDB,
);

router.get(
  '/:id',
  auth(UserRole.super_admin),
  BankDetailsController.getByIdFromDB,
);

router.get('/', auth(UserRole.super_admin), BankDetailsController.getAllFromDB);

router.delete(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  BankDetailsController.deleteFromDB,
);

export const BankDetailsRoutes = router;
