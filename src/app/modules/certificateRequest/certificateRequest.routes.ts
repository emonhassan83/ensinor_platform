import express from 'express';
import { CertificateRequestController } from './certificateRequest.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CertificateRequestValidation } from './certificateRequest.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(CertificateRequestValidation.createValidationSchema),
  CertificateRequestController.insertIntoDB,
);

router.get(
  '/my-requests',
  auth(UserRole.super_admin),
  CertificateRequestController.getByUserIdFromDB,
);

router.get(
  '/:courseId',
  auth(UserRole.super_admin),
  CertificateRequestController.getByCourseIdFromDB,
);

router.get('/:id', CertificateRequestController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(CertificateRequestValidation.updateValidationSchema),
  CertificateRequestController.updateIntoDB,
);

router.delete('/:id', auth(UserRole.super_admin), CertificateRequestController.deleteFromDB);

export const CertificateRequestRoutes = router;
