import express from 'express';
import { CVCertificateController } from './cvCertificate.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CVCertificateValidation } from './cvCertificate.validation';
import multer, { memoryStorage } from 'multer';
import parseData from '../../middlewares/parseData';

const router = express.Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.post(
  '/',
  auth(UserRole.student, UserRole.employee),
  upload.single('file'),
  parseData(),
  validateRequest(CVCertificateValidation.createValidationSchema),
  CVCertificateController.insertIntoDB,
);

router.get(
  '/cv/:cvId',
  auth(UserRole.student, UserRole.employee),
  CVCertificateController.getAllFromDB,
);

router.get(
  '/:id',
  auth(UserRole.student, UserRole.employee),
  CVCertificateController.getByIdFromDB,
);

router.put(
  '/:id',
  auth(UserRole.student, UserRole.employee),
  upload.single('file'),
  parseData(),
  validateRequest(CVCertificateValidation.updateValidationSchema),
  CVCertificateController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.student, UserRole.employee),
  CVCertificateController.deleteFromDB,
);

export const CVCertificateRoutes = router;
