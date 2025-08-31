import { Router } from 'express'
import { ordersController } from './orders.controller'
import auth from '../../middlewares/auth'
import { UserRole } from '@prisma/client'

const router = Router()

router.post('/', ordersController.createOrders)

router.patch(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin, UserRole.student),
  ordersController.updateOrders,
)

router.delete(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin, UserRole.student),
  ordersController.deleteOrders,
)

router.get(
  '/my-orders',
  auth(UserRole.super_admin, UserRole.company_admin, UserRole.student),
  ordersController.getMyOrders,
)

router.get(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin, UserRole.student),
  ordersController.getOrdersById,
)

router.get(
  '/',
  auth(UserRole.super_admin, UserRole.company_admin, UserRole.student),
  ordersController.getAllOrders,
)

export const OrdersRoutes = router
