import { Router } from 'express'
import { subscriptionController } from './subscription.controller'
import { SubscriptionValidation } from './subscription.validation'
import validateRequest from '../../middlewares/validateRequest'
import auth from '../../middlewares/auth'
import { UserRole } from '@prisma/client'

const router = Router()

router.post(
  '/',
  auth(UserRole.company_admin, UserRole.student),
  validateRequest(SubscriptionValidation.createValidationSchema),
  subscriptionController.createSubscription,
)

router.patch(
  '/:id',
  auth(UserRole.company_admin, UserRole.student),
  subscriptionController.updateSubscription,
)

router.delete(
  '/:id',
  auth(UserRole.company_admin, UserRole.student),
  subscriptionController.deleteSubscription,
)

router.get(
  '/my-subscriptions',
  auth(UserRole.student),
  subscriptionController.getMySubscription,
)

router.get(
  '/:id',
  auth(UserRole.company_admin, UserRole.student),
  subscriptionController.getSubscriptionById,
)

router.get(
  '/',
  auth(UserRole.company_admin, UserRole.student),
  subscriptionController.getAllSubscription,
)

export const SubscriptionRoutes = router
