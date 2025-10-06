import express from 'express';
import { MetaController } from './meta.controller';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import checkCompanyAdminSubscription from '../../middlewares/checkCompanySubscription';

const router = express.Router();

router.get('/website/web-meta', MetaController.websiteBannerMeta);

router.get(
  '/super-admin/dashboard-analysis',
  auth(UserRole.super_admin),
  MetaController.superAdminMetaDashboard,
);

router.get(
  '/super-admin/revenue-analysis',
  auth(UserRole.super_admin),
  MetaController.superAdminRevenueAnalysis,
);

router.get(
  '/super-admin/enrolment-analysis',
  auth(UserRole.super_admin),
  MetaController.superAdminEnrolmentAnalysis,
);

router.get(
  '/super-admin/content-analysis',
  auth(UserRole.super_admin),
  MetaController.superAdminContentAnalysis,
);

router.get(
  '/super-admin/user-analysis',
  auth(UserRole.super_admin),
  MetaController.superAdminUserAnalysis,
);

router.get(
  '/super-admin/subscription-analysis',
  auth(UserRole.super_admin),
  MetaController.superAdminSubscriptionAnalysis,
);

router.get(
  '/company-admin',
  auth(UserRole.company_admin),
  checkCompanyAdminSubscription(),
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

router.get('/student', auth(UserRole.student), MetaController.studentMetaData);

export const MetaRoutes = router;
