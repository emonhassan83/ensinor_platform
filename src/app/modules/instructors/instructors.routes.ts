import express from 'express';
import { InstructorController } from './instructors.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { InstructorValidation } from './instructors.validation';
import multer, { memoryStorage } from 'multer';
import parseData from '../../middlewares/parseData';

const router = express.Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.get('/', InstructorController.getAllFromDB);

router.get('/:id', InstructorController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin, UserRole.instructor),
  upload.single('image'),
  parseData(),
  validateRequest(InstructorValidation.updateValidationSchema),
  InstructorController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin, UserRole.instructor),
  InstructorController.deleteFromDB,
);

export const InstructorRoutes = router;
