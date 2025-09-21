import express from 'express';
import { StudentController } from './student.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { StudentValidation } from './student.validation';
import multer, { memoryStorage } from 'multer';
import parseData from '../../middlewares/parseData';

const router = express.Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.get('/', auth(UserRole.super_admin), StudentController.getAllFromDB);

router.get(
  '/:id',
  auth(UserRole.super_admin, UserRole.student),
  StudentController.getByIdFromDB,
);

router.put(
  '/:id',
  auth(UserRole.super_admin, UserRole.student),
  upload.single('image'),
  parseData(),
  validateRequest(StudentValidation.updateValidationSchema),
  StudentController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin, UserRole.student),
  StudentController.deleteFromDB,
);

export const StudentRoutes = router;
