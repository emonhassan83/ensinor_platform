import express from 'express';
import { StudentController } from './student.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { StudentValidation } from './student.validation';

const router = express.Router();

router.get('/', auth(UserRole.super_admin), StudentController.getAllFromDB);

router.get('/:id', auth(UserRole.super_admin, UserRole.student), StudentController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin, UserRole.student),
  validateRequest(StudentValidation.updateValidationSchema),
  StudentController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin, UserRole.student),
  StudentController.deleteFromDB,
);

export const StudentRoutes = router;
