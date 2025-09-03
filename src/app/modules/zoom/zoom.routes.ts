import express from 'express';
import { ZoomController } from './zoom.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { ZoomValidation } from './zoom.validation';

const router = express.Router();

router.post(
  '/connect',
  validateRequest(ZoomValidation.createAccountValidation),
  ZoomController.connectZoom,
);

router.post('/', ZoomController.refreshToken);

router.post(
  '/meetings',
  auth(UserRole.super_admin),
  validateRequest(ZoomValidation.createMeetingValidation),
  ZoomController.createMeeting,
);

router.get('/meetings', auth(UserRole.super_admin), ZoomController.getMeetings);

router.get(
  '/meetings/:id',
  auth(UserRole.super_admin),
  ZoomController.getMeeting,
);

router.put(
  '/meetings/:id',
  auth(UserRole.super_admin),
  validateRequest(ZoomValidation.updateMeetingValidation),
  ZoomController.updateMeeting,
);

router.delete(
  '/meetings/:id',
  auth(UserRole.super_admin),
  ZoomController.deleteMeeting,
);

router.post('/sync', auth(UserRole.super_admin), ZoomController.syncMeetings);

export const ZoomRoutes = router;
