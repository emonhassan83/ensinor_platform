import express from 'express';
import { ReviewController } from './review.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { ReviewValidation } from './review.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.student, UserRole.employee),
  validateRequest(ReviewValidation.createValidationSchema),
  ReviewController.insertIntoDB,
);

router.get('/', ReviewController.getAllFromDB);

router.get('/course/:courseId', ReviewController.getAllByCourseFromDB);

router.get(
  '/course-bundle/:courseBundleId',
  ReviewController.getAllByBundleCourseFromDB,
);

router.get('/:id', ReviewController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.student, UserRole.employee),
  validateRequest(ReviewValidation.updateValidationSchema),
  ReviewController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.student, UserRole.employee),
  ReviewController.deleteFromDB,
);

export const ReviewRoutes = router;
