import express from 'express';
import { EmployeeController } from './employee.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { EmployeeValidation } from './employee.validation';
import multer, { memoryStorage } from 'multer';
import parseData from '../../middlewares/parseData';

const router = express.Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.get('/', auth(UserRole.company_admin), EmployeeController.getAllFromDB);

router.get(
  '/:id',
  auth(UserRole.company_admin),
  EmployeeController.getByIdFromDB,
);

router.put(
  '/:id',
  auth(UserRole.company_admin, UserRole.employee),
  upload.single('image'),
  parseData(),
  validateRequest(EmployeeValidation.updateValidationSchema),
  EmployeeController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.company_admin, UserRole.employee),
  EmployeeController.deleteFromDB,
);

export const EmployeeRoutes = router;
