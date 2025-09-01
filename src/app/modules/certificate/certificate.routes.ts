import express from 'express';
import { CertificateController } from './certificate.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CertificateValidation } from './certificate.validation';
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
  validateRequest(CertificateValidation.createValidationSchema),
  CertificateController.insertIntoDB,
);

router.get(
  '/my-requests',
  auth(UserRole.super_admin),
  CertificateController.getByUserIdFromDB,
);

router.get(
  '/:courseId',
  auth(UserRole.super_admin),
  CertificateController.getByCourseIdFromDB,
);

router.get('/:id', CertificateController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  upload.single('image'),
  parseData(),
  validateRequest(CertificateValidation.updateValidationSchema),
  CertificateController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin),
  CertificateController.deleteFromDB,
);

export const CertificateRoutes = router;
