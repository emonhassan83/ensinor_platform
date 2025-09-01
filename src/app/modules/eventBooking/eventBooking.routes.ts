import express from 'express';
import { EventBookingController } from './eventBooking.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { EventValidation } from './eventBooking.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(EventValidation.createValidationSchema),
  EventBookingController.insertIntoDB,
);

router.get('/', EventBookingController.getAllFromDB);

router.get(
  '/my-event-booking',
  auth(UserRole.super_admin),
  EventBookingController.getAllFromDB,
);

router.get('/:id', EventBookingController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(EventValidation.updateValidationSchema),
  EventBookingController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin),
  EventBookingController.deleteFromDB,
);

export const EventBookingRoutes = router;
