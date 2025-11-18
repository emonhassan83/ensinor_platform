import express from 'express';
import { CertificateController } from './certificate.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CertificateValidation } from './certificate.validation';

const router = express.Router();

router.post(
  '/',
  auth(
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
    UserRole.super_admin,
  ),
  validateRequest(CertificateValidation.createValidationSchema),
  CertificateController.insertIntoDB,
);

router.get(
  '/my-certificate',
  auth(UserRole.student, UserRole.employee),
  CertificateController.getByMyCertificateFromDB,
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
