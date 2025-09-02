import express from 'express';
import { ReviewRefController } from './reviewRef.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { ReviewRefValidation } from './reviewRef.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(ReviewRefValidation.createValidationSchema),
  ReviewRefController.insertIntoDB,
);

router.get(
  '/review/:reviewId',
  auth(UserRole.super_admin),
  ReviewRefController.getAllByReviewFromDB,
);

router.get('/:id', ReviewRefController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(ReviewRefValidation.updateValidationSchema),
  ReviewRefController.updateIntoDB,
);

router.delete('/:id', auth(UserRole.super_admin), ReviewRefController.deleteFromDB);

export const ReviewRefRoutes = router;
