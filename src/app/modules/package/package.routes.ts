import express from 'express';
import { PackageController } from './package.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { PackageValidation } from './package.validation';
import parseData from '../../middlewares/parseData';
import multer, { memoryStorage } from 'multer';

const router = express.Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.post(
  '/',
  auth(UserRole.company_admin),
  upload.single('image'),
  parseData(),
  PackageController.insertIntoDB,
);

router.get(
  '/',
  auth(UserRole.super_admin, UserRole.company_admin),
  PackageController.getAllFromDB,
);

router.get(
  '/:id',
  auth(UserRole.company_admin),
  PackageController.getByIdFromDB,
);

router.put(
  '/:id',
  auth(UserRole.company_admin),
   upload.single('image'),
  parseData(),
  validateRequest(PackageValidation.updateValidationSchema),
  PackageController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.company_admin),
  PackageController.deleteFromDB,
);

export const PackageRoutes = router;
