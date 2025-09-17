import express from 'express';
import { MetaController } from './meta.controller';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';

const router = express.Router();

router.get(
  '/super-admin',
  auth(UserRole.super_admin),
  MetaController.superAdminMetaData,
);

router.get(
  '/company-admin',
  auth(UserRole.company_admin),
  MetaController.companyAdminMetaData,
);

router.get(
  '/business-instructor',
  auth(UserRole.business_instructors),
  MetaController.businessInstructorMetaData,
);

router.get(
  '/employee',
  auth(UserRole.employee),
  MetaController.employeeMetaData,
);

router.get(
  '/instructor',
  auth(UserRole.instructor),
  MetaController.instructorMetaData,
);

router.get(
  '/co-instructor',
  auth(UserRole.instructor, UserRole.business_instructors),
  MetaController.coInstructorMetaData,
);

router.get(
  '/student',
  auth(UserRole.student),
  MetaController.studentMetaData,
);

export const MetaRoutes = router;
