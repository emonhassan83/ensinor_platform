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

router.post('/zoom/refresh', ZoomController.refreshZoomToken);

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

router.get(
  '/zoom/meeting/my-meeting',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  ZoomController.getMyZoomMeeting,
);

router.get(
  '/zoom/meeting/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  ZoomController.getAZoomMeeting,
);

router.put(
  '/zoom/meeting/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  ZoomController.updateAZoomMeeting,
);

router.delete(
  '/zoom/meeting/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  ZoomController.deleteAZoomMeeting,
);

export const ZoomRoutes = router;
