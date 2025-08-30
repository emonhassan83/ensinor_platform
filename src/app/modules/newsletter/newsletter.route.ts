import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { NewsletterValidation } from './newsletter.validations';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { NewsletterController } from './newsletter.controller';

const router = express.Router();

router.post(
  '/',
  validateRequest(NewsletterValidation.createValidationSchema),
  NewsletterController.insertIntoDB,
);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(NewsletterValidation.updateValidationSchema),
  NewsletterController.updateIntoDB,
);

router.patch(
  '/status/:id',
  auth(UserRole.super_admin),
  NewsletterController.changeStatusIntoDB,
);

router.get('/:id', NewsletterController.getByIdFromDB);

router.get('/', NewsletterController.getAllFromDB);

router.delete(
  '/:id',
  auth(UserRole.super_admin),
  NewsletterController.deleteFromDB,
);

export const NewsletterRoutes = router;
