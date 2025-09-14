import { Router } from 'express';
import { ordersController } from './orders.controller';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import validateRequest from '../../middlewares/validateRequest';
import { OrderValidation } from './orders.validation';

const router = Router();

router.post(
  '/',
  validateRequest(OrderValidation.createValidationSchema),
  ordersController.createOrders,
);

router.patch(
  '/status/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(OrderValidation.updateValidationSchema),
  ordersController.updateOrders,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin, UserRole.student),
  ordersController.deleteOrders,
);

router.get(
  '/author/my-order',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.instructor,
    UserRole.business_instructors,
  ),
  ordersController.getAuthorOrders,
);

router.get(
  '/user/my-orders',
  auth(UserRole.student),
  ordersController.getMyOrders,
);

router.get(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin, UserRole.student),
  ordersController.getOrdersById,
);

export const OrdersRoutes = router;
