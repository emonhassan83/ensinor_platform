import express from 'express';
import { CertificateBuilderController } from './certificateBuilder.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CertificateRequestValidation } from './certificateBuilder.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.student, UserRole.employee),
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

router.get(
  '/:id',
  auth(
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
    UserRole.super_admin,
  ),
  CertificateBuilderController.getByIdFromDB,
);

router.put(
  '/:id',
  auth(
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
    UserRole.super_admin,
  ),
  validateRequest(CertificateRequestValidation.updateValidationSchema),
  CertificateBuilderController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
    UserRole.super_admin,
  ),
  CertificateBuilderController.deleteFromDB,
);

export const CertificateRequestRoutes = router;
