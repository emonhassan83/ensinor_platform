import express from 'express';
import { WishlistController } from './wishlist.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { WishlistValidation } from './wishlist.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.student),
  validateRequest(WishlistValidation.createValidationSchema),
  WishlistController.insertIntoDB,
);

router.get('/', auth(UserRole.student), WishlistController.getAllFromDB);

router.get(
  '/my-wishlist',
  auth(UserRole.student),
  WishlistController.getAllByUserFromDB,
);

router.get('/:id', auth(UserRole.student), WishlistController.getByIdFromDB);

router.delete('/:id', auth(UserRole.student), WishlistController.deleteFromDB);

router.delete(
  '/course/:courseId',
  auth(UserRole.student),
  WishlistController.deleteByReferenceFromDB,
);

router.delete(
  '/book/:bookId',
  auth(UserRole.student),
  WishlistController.deleteByReferenceFromDB,
);

export const WishlistRoutes = router;
