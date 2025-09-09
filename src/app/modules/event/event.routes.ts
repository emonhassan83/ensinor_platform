import express from 'express';
import { EventController } from './event.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { EventValidation } from './event.validation';
import parseData from '../../middlewares/parseData';
import multer, { memoryStorage } from 'multer';

const router = express.Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.post(
  '/',
  auth(UserRole.super_admin, UserRole.company_admin),
  upload.single('image'),
  parseData(),
  validateRequest(EventValidation.createValidationSchema),
  EventController.insertIntoDB,
);

router.get('/', EventController.getAllFromDB);

router.get(
  '/my-event',
  auth(UserRole.super_admin, UserRole.company_admin),
  EventController.getMyEventFromDB,
);

router.get('/:id', EventController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin),
  upload.single('image'),
  parseData(),
  validateRequest(EventValidation.updateValidationSchema),
  EventController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin),
  EventController.deleteFromDB,
);

export const EventRoutes = router;
