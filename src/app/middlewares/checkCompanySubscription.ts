import { NextFunction, Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import httpStatus from 'http-status';
import prisma from '../utils/prisma';
import {
  PaymentStatus,
  SubscriptionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import ApiError from '../errors/ApiError';

const checkCompanyAdminSubscription = () => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;
    const userRole = req.user?.role;

    // 1️⃣ If not company admin, allow
    if (userRole !== UserRole.company_admin) {
      return next();
    }

    // 2️⃣ Fetch user with subscriptions
    const user = await prisma.user.findUnique({
      where: { id: userId, status: UserStatus.active, isDeleted: false },
      include: {
        subscription: true,
      },
    });
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');
    }

    const today = new Date();

    // 3️⃣ Check if user has at least one active subscription
    const activeSubscription = user.subscription.find(
      sub =>
        sub.status === SubscriptionStatus.active &&
        sub.paymentStatus === PaymentStatus.paid &&
        !sub.isExpired &&
        !sub.isDeleted &&
        sub.expiredAt > today,
    );

    if (!activeSubscription) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Access denied! Company admin has no active subscription.',
      );
    }

    // 4️⃣ User has valid subscription, allow
    next();
  });
};

export default checkCompanyAdminSubscription;
