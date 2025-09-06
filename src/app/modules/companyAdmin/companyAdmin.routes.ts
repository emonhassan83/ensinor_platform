import express from 'express';
import { CompanyAdminController } from './companyAdmin.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CompanyAdminValidation } from './companyAdmin.validation';
import multer, { memoryStorage } from 'multer';
import parseData from '../../middlewares/parseData';

const router = express.Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.get(
  '/',
  auth(UserRole.super_admin),
  CompanyAdminController.getAllFromDB,
);

router.get(
  '/:id',
  auth(UserRole.super_admin),
  CompanyAdminController.getByIdFromDB,
);

router.put(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin),
  upload.single('image'),
  parseData(),
  validateRequest(CompanyAdminValidation.updateValidationSchema),
  CompanyAdminController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(UserRole.super_admin, UserRole.company_admin),
  CompanyAdminController.deleteFromDB,
);

export const CompanyAdminRoutes = router;
