import express from 'express';
import { WithdrawRequestController } from './withdrawRequest.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { WithdrawRequestValidation } from './withdrawRequest.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(WithdrawRequestValidation.createValidationSchema),
  WithdrawRequestController.insertIntoDB,
);

router.get(
  '/user/:userId',
  auth(UserRole.super_admin),
  WithdrawRequestController.getAllByUserFromDB,
);

router.get('/:id', WithdrawRequestController.getByIdFromDB);

router.patch(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(WithdrawRequestValidation.updateValidationSchema),
  WithdrawRequestController.updateIntoDB,
);

router.delete('/:id', auth(UserRole.super_admin), WithdrawRequestController.deleteFromDB);

export const WithdrawRequestRoutes = router;
