import express from 'express';
import { ReportsController } from './reports.controller';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';

const router = express.Router();

router.get(
  '/student-reports',
  auth(UserRole.super_admin),
  ReportsController.studentReports,
);

router.get(
  '/course-reports',
  auth(UserRole.super_admin),
  ReportsController.courseReports,
);

router.get(
  '/revenue-reports',
  auth(UserRole.super_admin),
  ReportsController.revenueReports,
);

router.get(
  '/business-reports',
  auth(UserRole.super_admin),
  ReportsController.businessReports,
);

router.get(
  '/events-reports',
  auth(UserRole.super_admin),
  ReportsController.eventReports,
);

router.get(
  '/course-completion-reports/:companyId',
  auth(UserRole.super_admin),
  ReportsController.courseCompletionReports,
);

router.get(
  '/quiz-reports/:companyId',
  auth(UserRole.super_admin),
  ReportsController.quizReports,
);

router.get(
  '/attendance-reports/:companyId',
  auth(UserRole.super_admin),
  ReportsController.attendanceReports,
);

export const ReportsRoutes = router;
