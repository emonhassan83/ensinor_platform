import express from 'express';
import { EventScheduleController } from './eventSchedule.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { EventScheduleValidation } from './eventSchedule.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin, UserRole.company_admin),
  validateRequest(EventScheduleValidation.createValidationSchema),
  EventScheduleController.insertIntoDB,
);

router.get(
  '/event/:eventId',
  EventScheduleController.getAllByEventFromDB,
);

router.get('/:id', EventScheduleController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin),
  validateRequest(EventScheduleValidation.updateValidationSchema),
  EventScheduleController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin),
  EventScheduleController.deleteFromDB,
);

export const EventScheduleRoutes = router;
