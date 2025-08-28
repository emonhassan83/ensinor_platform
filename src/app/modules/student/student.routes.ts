import express from 'express';
import { StudentController } from './student.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { StudentValidation } from './student.validation';

const router = express.Router();

router.get('/', StudentController.getAllFromDB);

router.get(
  '/:id',
  auth(UserRole.super_admin),
  StudentController.getByIdFromDB,
);

router.patch(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin),
  validateRequest(StudentValidation.updateValidationSchema),
  StudentController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin),
  StudentController.deleteFromDB,
);

export const StudentRoutes = router;
