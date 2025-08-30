import express from 'express'
import { NotificationControllers } from './notification.controller'
import auth from '../../middlewares/auth'
import { UserRole } from '@prisma/client'
import validateRequest from '../../middlewares/validateRequest'
import { NotificationValidation } from './notification.validation'

const router = express.Router()

router.post(
  '/general-notification',
  auth(UserRole.super_admin),
  validateRequest(NotificationValidation.createValidation),
  NotificationControllers.sentGeneralNotification,
)

router.delete(
  '/my-notifications',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.employee,
    UserRole.instructor,
    UserRole.student,
  ),
  NotificationControllers.deleteAllNotifications,
)

router.delete(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.employee,
    UserRole.instructor,
    UserRole.student,
  ),
  NotificationControllers.deleteANotification,
)

router.patch(
  '/',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.employee,
    UserRole.instructor,
    UserRole.student,
  ),
  NotificationControllers.markAsDoneNotification,
)

router.get(
  '/',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.employee,
    UserRole.instructor,
    UserRole.student,
  ),
  NotificationControllers.getAllNotifications,
)

router.get(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.employee,
    UserRole.instructor,
    UserRole.student,
  ),
  NotificationControllers.getANotification,
)

export const NotificationRoutes = router
