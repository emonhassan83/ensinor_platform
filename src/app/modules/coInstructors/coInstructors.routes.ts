import express from 'express';
import { CoInstructorController } from './coInstructors.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CoInstructorValidation } from './coInstructors.validation';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.business_instructors, UserRole.instructor),
  validateRequest(CoInstructorValidation.createValidationSchema),
  CoInstructorController.inviteCoInstructor,
);

router.get(
  '/my-co-instructors',
  auth(UserRole.business_instructors, UserRole.instructor),
  CoInstructorController.getAllFromDB,
);

router.get(
  '/my-courses',
  auth(UserRole.business_instructors, UserRole.instructor),
  CoInstructorController.getCoInstructorCourses,
);

router.get(
  '/:id',
  auth(UserRole.business_instructors, UserRole.instructor),
  CoInstructorController.getByIdFromDB,
);

router.patch(
  '/revoke/:id',
  auth(UserRole.business_instructors, UserRole.instructor),
  CoInstructorController.revokeAccess,
);

router.put(
  '/:id',
  auth(UserRole.business_instructors, UserRole.instructor),
  validateRequest(CoInstructorValidation.updateValidationSchema),
  CoInstructorController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.business_instructors, UserRole.instructor),
  CoInstructorController.deleteIntoDB,
);

export const CoInstructorRoutes = router;
