import express from 'express';
import { EventBookingController } from './eventBooking.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { EventValidation } from './eventBooking.validation';

const router = express.Router();

router.post(
  '/',
  auth(
    UserRole.student,
    UserRole.employee,
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
    UserRole.super_admin,
  ),
  validateRequest(EventValidation.createValidationSchema),
  EventBookingController.insertIntoDB,
);

router.get(
  '/author/my-event-booking',
  auth(
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
    UserRole.super_admin,
  ),
  EventBookingController.getByAuthorFromDB,
);

router.get(
  '/user/my-event-booking',
  auth(
    UserRole.student,
    UserRole.employee,
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
    UserRole.super_admin,
  ),
  EventBookingController.getByUserFromDB,
);

router.get(
  '/:id',
  auth(
    UserRole.student,
    UserRole.employee,
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
    UserRole.super_admin,
  ),
  EventBookingController.getByIdFromDB,
);

router.put(
  '/:id',
    auth(
    UserRole.student,
    UserRole.employee,
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
    UserRole.super_admin,
  ),
  validateRequest(EventValidation.updateValidationSchema),
  EventBookingController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(
    UserRole.student,
    UserRole.employee,
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
    UserRole.super_admin,
  ),
  EventBookingController.deleteFromDB,
);

export const EventBookingRoutes = router;
