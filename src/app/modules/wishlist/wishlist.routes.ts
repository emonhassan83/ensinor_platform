import express from 'express';
import { WishlistController } from './wishlist.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { WishlistValidation } from './wishlist.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.student, UserRole.employee),
  validateRequest(WishlistValidation.createValidationSchema),
  WishlistController.insertIntoDB,
);

router.get(
  '/',
  auth(UserRole.student, UserRole.employee),
  WishlistController.getAllFromDB,
);

router.get(
  '/my-wishlist',
  auth(UserRole.student, UserRole.employee),
  WishlistController.getAllByUserFromDB,
);

router.get(
  '/:id',
  auth(UserRole.student, UserRole.employee),
  WishlistController.getByIdFromDB,
);

router.delete(
  '/:id',
  auth(UserRole.student, UserRole.employee),
  WishlistController.deleteFromDB,
);

router.delete(
  '/course/:courseId',
  auth(UserRole.student, UserRole.employee),
  WishlistController.deleteByReferenceFromDB,
);

router.delete(
  '/courseBundle/:courseBundleId',
  auth(UserRole.student, UserRole.employee),
  WishlistController.deleteByReferenceFromDB,
);

router.delete(
  '/book/:bookId',
  auth(UserRole.student, UserRole.employee),
  WishlistController.deleteByReferenceFromDB,
);

export const WishlistRoutes = router;
