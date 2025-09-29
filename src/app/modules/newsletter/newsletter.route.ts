import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { NewsletterValidation } from './newsletter.validations';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { NewsletterController } from './newsletter.controller';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(NewsletterValidation.createValidationSchema),
  NewsletterController.insertIntoDB,
);

router.post(
  '/subscribe',
  validateRequest(NewsletterValidation.subscribeValidationSchema),
  NewsletterController.subscribeUser,
);

router.post(
  '/unsubscribe',
  validateRequest(NewsletterValidation.unsubscribeValidationSchema),
  NewsletterController.unsubscribeUser,
);

router.patch(
  '/subscribe/change-status',
  validateRequest(NewsletterValidation.changeSubscriberValidationSchema),
  NewsletterController.changeStatusIntoDB,
);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(NewsletterValidation.updateValidationSchema),
  NewsletterController.updateIntoDB,
);

router.get(
  '/:id',
  auth(UserRole.super_admin),
  NewsletterController.getByIdFromDB,
);

router.get('/', auth(UserRole.super_admin), NewsletterController.getAllFromDB);

router.delete(
  '/:id',
  auth(UserRole.super_admin),
  NewsletterController.deleteFromDB,
);

export const NewsletterRoutes = router;
