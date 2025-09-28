import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { CartValidation } from './cart.validations';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CartController } from './cart.controller';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.student),
  validateRequest(CartValidation.createValidationSchema),
  CartController.insertIntoDB,
);

router.get('/:id', auth(UserRole.student), CartController.getByIdFromDB);

router.get('/', auth(UserRole.student), CartController.getAllFromDB);

router.delete('/:id', auth(UserRole.student), CartController.deleteFromDB);

export const CartRoutes = router;
