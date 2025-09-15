import express from 'express';
import { AssignmentController } from './assignment.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { AssignmentValidation } from './assignment.validation';

const router = express.Router();

router.post(
  '/',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(AssignmentValidation.createValidationSchema),
  AssignmentController.insertIntoDB,
);

router.get(
  '/author/my-assignment',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  AssignmentController.getAllAuthorAssignment,
);

router.get(
  '/course/:courseId',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
    UserRole.employee,
    UserRole.student
  ),
  AssignmentController.getAllCourseAssignment,
);

router.get(
  '/:id',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
    UserRole.employee,
    UserRole.student
  ),
  AssignmentController.getByIdFromDB,
);

router.put(
  '/:id',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(AssignmentValidation.updateValidationSchema),
  AssignmentController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  AssignmentController.deleteFromDB,
);

export const AssignmentRoutes = router;
