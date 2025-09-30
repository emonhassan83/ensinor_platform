import { Router } from 'express';
import { PaymentController } from './payment.controller';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import validateRequest from '../../middlewares/validateRequest';
import { OrderValidation } from './payment.validation';

const router = Router();

router.post(
  '/checkout',
  validateRequest(OrderValidation.createValidationSchema),
  PaymentController.insertIntoDB,
);

router.get('/confirm-payment', PaymentController.confirmPayment);

router.patch(
  '/status/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(OrderValidation.updateValidationSchema),
  PaymentController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin, UserRole.student),
  PaymentController.deleteIntoDB,
);

router.get(
  '/author/my-payment',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.instructor,
    UserRole.business_instructors,
  ),
  PaymentController.getByAuthorIntoDB,
);

router.get(
  '/user/my-payment',
  auth(UserRole.student),
  PaymentController.getMyAllIntoDB,
);

router.get('/', auth(UserRole.super_admin), PaymentController.getAllIntoDB);

router.get(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin, UserRole.student),
  PaymentController.getByIdIntoDB,
);

router.patch('/refound-payment', PaymentController.refundPayment);

export const PaymentRoutes = router;
