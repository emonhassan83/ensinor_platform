import express from 'express';
import { EventSpeakerController } from './eventSpeaker.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { EventSpeakerValidation } from './eventSpeaker.validation';
import parseData from '../../middlewares/parseData';
import multer, { memoryStorage } from 'multer';

const router = express.Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.post(
  '/',
  auth(UserRole.super_admin),
  upload.single('image'),
  parseData(),
  validateRequest(EventSpeakerValidation.createValidationSchema),
  EventSpeakerController.insertIntoDB,
);

router.get('/schedule/:scheduleId', EventSpeakerController.getByScheduleFromDB);

router.get('/event/:eventId', EventSpeakerController.getByEventFromDB);

router.get('/:id', EventSpeakerController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  upload.single('image'),
  parseData(),
  validateRequest(EventSpeakerValidation.updateValidationSchema),
  EventSpeakerController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin),
  EventSpeakerController.deleteFromDB,
);

export const EventSpeakerRoutes = router;
