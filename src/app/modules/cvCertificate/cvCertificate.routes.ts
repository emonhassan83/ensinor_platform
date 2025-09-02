import express from 'express';
import { CVCertificateController } from './cvCertificate.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CVCertificateValidation } from './cvCertificate.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(CVCertificateValidation.createValidationSchema),
  CVCertificateController.insertIntoDB,
);

router.get(
  '/:cvId',
  auth(UserRole.super_admin),
  CVCertificateController.getAllFromDB,
);

router.get('/:id', CVCertificateController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(CVCertificateValidation.updateValidationSchema),
  CVCertificateController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin),
  CVCertificateController.deleteFromDB,
);

export const CVCertificateRoutes = router;
