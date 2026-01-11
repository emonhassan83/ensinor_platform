import express from 'express';
import { ZoomController } from './zoom.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { ZoomValidation } from './zoom.validation';

const router = express.Router();

router.get(
  '/auth/zoom',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  ZoomController.redirectToZoomAuth,
);

router.get(
  '/zoom/account',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  ZoomController.getZoomAccount,
);

router.get('/auth/zoom/callback', ZoomController.zoomAuthCallback);

router.post('/refresh', ZoomController.refreshZoomToken);

router.post(
  '/zoom/create-meeting',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(ZoomValidation.createMeetingValidation),
  ZoomController.createZoomMeeting,
);

export const ZoomRoutes = router;
