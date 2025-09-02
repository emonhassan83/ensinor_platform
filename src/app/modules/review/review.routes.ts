import express from 'express';
import { ReviewController } from './review.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { ReviewValidation } from './review.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.super_admin),
  validateRequest(ReviewValidation.createValidationSchema),
  ReviewController.insertIntoDB,
);

router.get('/', ReviewController.getAllFromDB);

router.get(
  '/reference/:referenceId',
  auth(UserRole.super_admin),
  ReviewController.getAllByReferenceFromDB,
);

router.get('/:id', ReviewController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(ReviewValidation.updateValidationSchema),
  ReviewController.updateIntoDB,
);

router.delete('/:id', auth(UserRole.super_admin), ReviewController.deleteFromDB);

export const ReviewRoutes = router;
