import express from 'express';
import { CertificateRequestController } from './certificateRequest.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CertificateRequestValidation } from './certificateRequest.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.student),
  validateRequest(CertificateRequestValidation.createValidationSchema),
  CertificateRequestController.insertIntoDB,
);

router.get(
  '/my-requests',
  auth(UserRole.student),
  CertificateRequestController.getByUserIdFromDB,
);

router.get(
  '/author/:authorId',
  auth(
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
    UserRole.super_admin,
  ),
  CertificateRequestController.getByAuthorIdFromDB,
);

router.get('/:id', CertificateRequestController.getByIdFromDB);

router.put(
  '/:id',
  auth(
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
    UserRole.super_admin,
  ),
  validateRequest(CertificateRequestValidation.updateValidationSchema),
  CertificateRequestController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
    UserRole.super_admin,
  ),
  CertificateRequestController.deleteFromDB,
);

export const CertificateRequestRoutes = router;
