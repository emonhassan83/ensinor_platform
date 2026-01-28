import { Router } from 'express';
import { stripeController } from './stripe.controller';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';

const router = Router();

router.post(
  '/connect',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  stripeController.stripLinkAccount,
);

router.get(
  '/check-connection',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  stripeController.checkStripeConnected,
);

router.get('/oauth/callback', stripeController?.handleStripeOAuth);
router.get('/return', stripeController.returnUrl);
router.get('/refresh/:id', stripeController.refresh);

export const StripeRoute = router;
