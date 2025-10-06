import express from 'express';
import { EventScheduleController } from './eventSchedule.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { EventScheduleValidation } from './eventSchedule.validation';
import checkCompanyAdminSubscription from '../../middlewares/checkCompanySubscription';

const router = express.Router();

router.post(
  '/',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  checkCompanyAdminSubscription(),
  validateRequest(EventScheduleValidation.createValidationSchema),
  EventScheduleController.insertIntoDB,
);

router.get('/event/:eventId', EventScheduleController.getAllByEventFromDB);

router.get('/:id', EventScheduleController.getByIdFromDB);

router.put(
  '/:id',
   auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  checkCompanyAdminSubscription(),
  validateRequest(EventScheduleValidation.updateValidationSchema),
  EventScheduleController.updateIntoDB,
);

router.delete(
  '/:id',
   auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  checkCompanyAdminSubscription(),
  EventScheduleController.deleteFromDB,
);

export const EventScheduleRoutes = router;
