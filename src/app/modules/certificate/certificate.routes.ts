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
  auth(
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
    UserRole.super_admin,
  ),
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'signature', maxCount: 1 },
  ]),
  parseData(),
  validateRequest(CertificateValidation.createValidationSchema),
  CertificateController.insertIntoDB,
);

router.get(
  '/user/my-certificate',
  auth(UserRole.student, UserRole.employee),
  CertificateController.getByMyCertificateFromDB,
);

router.get(
  '/author/my-certificate',
  auth(
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
    UserRole.super_admin,
  ),
  CertificateController.getByAuthorIdFromDB,
);

router.get(
  '/:id',
  auth(
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
    UserRole.super_admin,
  ),
  CertificateController.getByIdFromDB,
);

router.put(
  '/:id',
  auth(
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
    UserRole.super_admin,
  ),
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'signature', maxCount: 1 },
  ]),
  parseData(),
  validateRequest(CertificateValidation.updateValidationSchema),
  CertificateController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
    UserRole.super_admin,
  ),
  CertificateController.deleteFromDB,
);

export const CertificateRoutes = router;
