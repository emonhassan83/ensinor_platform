import express from 'express';
import { ResourceController } from './resources.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { ResourceValidation } from './resources.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(ResourceValidation.createValidationSchema),
  ResourceController.insertIntoDB,
);

router.get('/', ResourceController.getAllFromDB);

router.get(
  '/reference/:referenceId',
  auth(UserRole.super_admin),
  ResourceController.getAllByReferenceFromDB,
);

router.get('/:id', ResourceController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(ResourceValidation.updateValidationSchema),
  ResourceController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin),
  ResourceController.deleteFromDB,
);

export const ResourceRoutes = router;
