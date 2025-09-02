import express from 'express';
import { CVController } from './cv.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CVValidation } from './cv.validation';
import multer, { memoryStorage } from 'multer';
import parseData from '../../middlewares/parseData';

const router = express.Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.post(
  '/',
  auth(UserRole.super_admin),
  upload.single('image'),
  parseData(),
  validateRequest(CVValidation.createValidationSchema),
  CVController.insertIntoDB,
);

router.get(
  '/my-cv',
  auth(UserRole.student),
  CVController.getMyCVFromDB,
);

router.get(
  '/',
  auth(UserRole.super_admin),
  CVController.getAllFromDB,
);

router.get('/:id', CVController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  upload.single('image'),
  parseData(),
  validateRequest(CVValidation.updateValidationSchema),
  CVController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin),
  CVController.deleteFromDB,
);

export const CVRoutes = router;
