import express from 'express';
import { ResourceController } from './resources.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { ResourceValidation } from './resources.validation';
import multer, { memoryStorage } from 'multer';
import parseData from '../../middlewares/parseData';

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
  upload.single('file'),
  parseData(),
  validateRequest(ResourceValidation.createValidationSchema),
  ResourceController.insertIntoDB,
);

router.get(
  '/my-resource',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  ResourceController.getAllMyFromDB,
);

router.get('/course/:courseId', ResourceController.getAllByCourseFromDB);

router.get('/book/:bookId', ResourceController.getAllByBookFromDB);

router.get('/event/:eventId', ResourceController.getAllByEventFromDB);

router.get('/:id', ResourceController.getByIdFromDB);

router.put(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  upload.single('file'),
  parseData(),
  validateRequest(ResourceValidation.updateValidationSchema),
  ResourceController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  ResourceController.deleteFromDB,
);

export const ResourceRoutes = router;
