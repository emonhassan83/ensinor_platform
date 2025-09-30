import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { CartValidation } from './cart.validations';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CartController } from './cart.controller';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.student, UserRole.employee),
  validateRequest(CartValidation.createValidationSchema),
  CartController.insertIntoDB,
);

router.get(
  '/:id',
  auth(UserRole.student, UserRole.employee),
  CartController.getByIdFromDB,
);

router.get(
  '/',
  auth(UserRole.student, UserRole.employee),
  CartController.getAllFromDB,
);

router.delete(
  '/my-cart',
  auth(UserRole.student, UserRole.employee),
  CartController.deleteMyCart,
);

router.delete(
  '/:id',
  auth(UserRole.student, UserRole.employee),
  CartController.deleteFromDB,
);

export const CartRoutes = router;
