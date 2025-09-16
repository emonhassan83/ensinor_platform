import { Router } from 'express';
import auth from '../../middleware/auth';
import { stripeController } from './stripe.controller';
import { USER_ROLE } from '../user/user.constant';

const router = Router();

router.patch(
  '/connect',
  auth(USER_ROLE.vendor),
  stripeController.stripLinkAccount,
);
router.get('/oauth/callback', stripeController?.handleStripeOAuth);
router.get('/return', stripeController.returnUrl);
router.get('/refresh/:id', stripeController.refresh);

export const StripeRoute = router;
