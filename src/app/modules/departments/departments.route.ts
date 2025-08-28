import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { DepartmentValidation } from './departments.validations';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import multer, { memoryStorage } from 'multer';
import parseData from '../../middlewares/parseData';
import { DepartmentController } from './departments.controller';

const router = express.Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.post(
  '/',
  auth(UserRole.super_admin, UserRole.company_admin),
  upload.single('image'),
  parseData(),
  validateRequest(DepartmentValidation.createValidationSchema),
  DepartmentController.insertIntoDB,
);

router.put(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin),
  upload.single('image'),
  parseData(),
  validateRequest(DepartmentValidation.updateValidationSchema),
  DepartmentController.updateIntoDB,
);

router.get('/:id', DepartmentController.getByIdFromDB);

router.get('/', DepartmentController.getAllFromDB);

router.delete(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin),
  DepartmentController.deleteFromDB,
);

export const DepartmentRoutes = router;
