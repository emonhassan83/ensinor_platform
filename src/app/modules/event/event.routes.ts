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
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  upload.single('image'),
  parseData(),
  validateRequest(EventValidation.createValidationSchema),
  EventController.insertIntoDB,
);

router.get('/trending', EventController.getTrendingEvents);

router.get('/', EventController.getAllFromDB);

router.get('/filter-data', EventController.eventFilterData);

router.get(
  '/user/my-events',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  EventController.getMyEventFromDB,
);

router.get(
  '/company/:companyId',
  auth(UserRole.company_admin),
  EventController.getCompanyEventFromDB,
);

router.get('/:id', EventController.getByIdFromDB);

router.put(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  upload.single('image'),
  parseData(),
  validateRequest(EventValidation.updateValidationSchema),
  EventController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  EventController.deleteFromDB,
);

export const EventRoutes = router;
