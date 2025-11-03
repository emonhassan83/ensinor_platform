import express from 'express';
import { ZoomController } from './zoom.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { ZoomValidation } from './zoom.validation';

const router = express.Router();

router.get(
  '/auth/zoom',
  ZoomController.redirectToZoomAuth,
);

router.get('/auth/zoom/callback', ZoomController.zoomAuthCallback);

router.post('/refresh', ZoomController.refreshZoomToken);

router.post(
  '/zoom/create-meeting',
  // auth(UserRole.super_admin),
  // validateRequest(ZoomValidation.createMeetingValidation),
  ZoomController.createZoomMeeting,
);

export const ZoomRoutes = router;
