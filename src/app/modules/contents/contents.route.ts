import { Router } from 'express';
import { contentsController } from './contents.controller';
import { contentsValidation } from './contents.validation';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import validateRequest from '../../middlewares/validateRequest';

const router = Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(contentsValidation.createValidationSchema),
  contentsController.createContents,
);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(contentsValidation.updateValidationSchema),
  contentsController.updateContents,
);

router.get('/:id', contentsController.getContentsById);

router.get('/', contentsController.getAllContents);

router.delete(
  '/:id',
  auth(UserRole.super_admin),
  contentsController.deleteContents,
);

export const ContentsRoutes = router;
