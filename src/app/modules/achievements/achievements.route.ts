import express from 'express';
import { AchievementsController } from './achievements.controller';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';

const router = express.Router();

router.get(
  '/my-achievements',
  auth(UserRole.student, UserRole.employee),
  AchievementsController.myAchievements,
);

router.get(
  '/earn-badges',
  auth(UserRole.student, UserRole.employee),
  AchievementsController.earnBadges,
);

router.get(
  '/available-badges',
  auth(UserRole.student, UserRole.employee),
  AchievementsController.availableBadges,
);

router.patch(
  '/assign-badges/:badgeId',
  auth(
    UserRole.instructor,
    UserRole.business_instructors,
    UserRole.company_admin,
  ),
  AchievementsController.assignBadges,
);

export const AchievementsRoutes = router;
