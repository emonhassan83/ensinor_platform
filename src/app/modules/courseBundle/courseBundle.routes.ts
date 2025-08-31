import express from 'express';
import { CourseBundleController } from './courseBundle.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CourseBundleValidation } from './courseBundle.validation';
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
  validateRequest(CourseBundleValidation.createValidationSchema),
  CourseBundleController.insertIntoDB,
);

router.get('/', CourseBundleController.getAllFromDB);

router.get(
  '/my-Course',
  auth(UserRole.super_admin),
  CourseBundleController.getMyCourseFromDB,
);

router.get('/:id', CourseBundleController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
   upload.single('image'),
  parseData(),
  validateRequest(CourseBundleValidation.updateValidationSchema),
  CourseBundleController.updateIntoDB,
);

router.delete('/:id', auth(UserRole.super_admin), CourseBundleController.deleteFromDB);

export const CourseBundleRoutes = router;
