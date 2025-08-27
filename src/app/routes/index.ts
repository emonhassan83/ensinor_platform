import express from 'express';
import { userRoutes } from '../modules/user/user.route';
import { AuthRoutes } from '../modules/auth/auth.route';
import { otpRoutes } from '../modules/otp/otp.route';
import { ContentsRoutes } from '../modules/contents/contents.route';
import { NotificationRoutes } from '../modules/notification/notification.route';

const router = express.Router();

const moduleRoutes = [
  {
    path: '/users',
    route: userRoutes,
  },
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/otp',
    route: otpRoutes,
  },
  {
    path: '/contents',
    route: ContentsRoutes,
  },
  {
    path: '/notification',
    route: NotificationRoutes,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));
export default router;
