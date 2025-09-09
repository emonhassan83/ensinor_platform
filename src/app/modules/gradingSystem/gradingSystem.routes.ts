import express from 'express';
import { GradingSystemController } from './gradingSystem.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { GradingSystemValidation } from './gradingSystem.validation';

const router = express.Router();

router.post(
  '/',
  auth(
    UserRole.super_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(GradingSystemValidation.createValidationSchema),
  GradingSystemController.insertIntoDB,
);

router.post(
  '/grade',
  auth(
    UserRole.super_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(GradingSystemValidation.gradeCreateSchema),
  GradingSystemController.addGrade,
);

router.get(
  '/course/:courseId',
  auth(
    UserRole.super_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  GradingSystemController.getByCourseIdFromDB,
);

router.get('/:id', GradingSystemController.getByIdFromDB);

router.get(
  '/grade/:gradingSystemId',
  GradingSystemController.getGradesByGradingSystemId,
);

router.put(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(GradingSystemValidation.updateValidationSchema),
  GradingSystemController.updateIntoDB,
);

router.put(
  '/grade/:id',
  auth(
    UserRole.super_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  validateRequest(GradingSystemValidation.gradeUpdateSchema),
  GradingSystemController.updateGrade,
);

router.delete(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  GradingSystemController.deleteFromDB,
);

router.delete(
  '/grade/:gradeId',
  auth(
    UserRole.super_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  GradingSystemController.deleteGrade,
);

export const GradingSystemRoutes = router;
