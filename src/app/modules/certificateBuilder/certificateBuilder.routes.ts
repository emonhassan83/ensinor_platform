import express from 'express';
import { CertificateBuilderController } from './certificateBuilder.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CertificateRequestValidation } from './certificateBuilder.validation';
import multer, { memoryStorage } from 'multer';
import parseData from '../../middlewares/parseData';

const router = express.Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.post(
  '/',
  auth(
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
    UserRole.super_admin,
  ),
  upload.single('image'),
  parseData(),
  validateRequest(CertificateRequestValidation.createValidationSchema),
  CertificateBuilderController.insertIntoDB,
);

router.get(
  '/my-certificate-builder',
  auth(
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
    UserRole.super_admin,
  ),
  CertificateBuilderController.getByAuthorIdFromDB,
);

router.put(
  '/update-certificate-builder',
  auth(
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
    UserRole.super_admin,
  ),
  upload.single('image'),
  parseData(),
  CertificateBuilderController.updateIntoDB,
);

router.delete(
  '/delete-certificate-builder',
  auth(
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
    UserRole.super_admin,
  ),
  CertificateBuilderController.deleteFromDB,
);

export const CertificateBuilderRoutes = router;
