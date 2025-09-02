import express from 'express';
import { WishlistController } from './wishlist.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { WishlistValidation } from './wishlist.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(WishlistValidation.createValidationSchema),
  WishlistController.insertIntoDB,
);

router.get('/', WishlistController.getAllFromDB);

router.get(
  '/reference/:referenceId',
  auth(UserRole.super_admin),
  WishlistController.getAllByReferenceFromDB,
);

router.get('/:id', WishlistController.getByIdFromDB);

// router.put(
//   '/:id',
//   auth(UserRole.super_admin),
//   validateRequest(WishlistValidation.updateValidationSchema),
//   WishlistController.updateIntoDB,
// );

router.delete('/:id', auth(UserRole.super_admin), WishlistController.deleteFromDB);

export const WishlistRoutes = router;
