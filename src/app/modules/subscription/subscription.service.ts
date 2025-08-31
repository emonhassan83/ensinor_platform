import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import cron from 'node-cron';
import prisma from '../../utils/prisma';
import { PaymentStatus, Prisma } from '@prisma/client';
import {
  ISubscription,
  ISubscriptionFilterRequest,
} from './subscription.interface';
import { IPaginationOptions } from '../../interfaces/pagination';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { subscriptionSearchAbleFields } from './subscription.constants';

export const startSubscriptionCron = () => {
  // run at every 12th hour: '0 */12 * * *'
  cron.schedule('0 */12 * * *', async () => {
    console.log('⏰ Running subscription check every 12 hours...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date();
    tomorrow.setHours(23, 59, 59, 999);

    try {
      // 1) Notify about expiring today (paid & not expired)
      const expiringToday = await prisma.subscription.findMany({
        where: {
          expiredAt: { gte: today, lte: tomorrow },
          isExpired: false,
          paymentStatus: PaymentStatus.paid,
        },
        include: {
          package: true,
          user: true,
        },
      });

      for (const subscription of expiringToday) {
        // implement notification function: subscriptionNotifyToUser('WARNING', package, subscription, user)
        console.log(
          `⚠️ Subscription expiring soon for user ${subscription.userId} package ${subscription.packageId}`,
        );
        // TODO: call your notification util here
      }

      // 2) Mark as expired (expiredAt < today)
      const alreadyExpired = await prisma.subscription.findMany({
        where: {
          expiredAt: { lt: today },
          isExpired: false,
          paymentStatus: PaymentStatus.paid,
        },
        include: { user: true },
      });

      if (alreadyExpired.length > 0) {
        // update in a transaction
        const tx = await prisma.$transaction(
          alreadyExpired.map(s =>
            prisma.subscription.update({
              where: { id: s.id },
              data: { isExpired: true, isDeleted: true, status: 'expired' },
            }),
          ),
        );

        // Optionally clear user.packageExpiry if it equals the expired date
        for (const s of alreadyExpired) {
          try {
            const user = await prisma.user.findUnique({
              where: { id: s.userId },
            });
            if (
              user &&
              user.packageExpiry &&
              user.packageExpiry <= new Date()
            ) {
              await prisma.user.update({
                where: { id: user.id },
                data: { packageExpiry: null },
              });
            }
          } catch (err) {
            console.warn(
              'Failed to clear user.packageExpiry for',
              s.userId,
              err,
            );
          }
        }
      }

      console.log(
        `✅ Subscription cron done: ${expiringToday.length} warnings, ${alreadyExpired.length} marked expired.`,
      );
    } catch (error) {
      console.error('❌ Subscription cron error:', error);
    }
  });
};

/**
 * Create subscription
 */
const createSubscription = async (payload: ISubscription) => {
  // 1) check existing unpaid subscription for same user & package
  const existingUnpaid = await prisma.subscription.findFirst({
    where: {
      userId: payload.userId,
      packageId: payload.packageId,
      paymentStatus: 'unpaid',
      status: 'pending',
    },
  });

  if (existingUnpaid) {
    return existingUnpaid;
  }

  // 2) find user
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.isDeleted)
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');
  if (user.status === 'blocked')
    throw new ApiError(httpStatus.FORBIDDEN, 'Your account is blocked!');

  // 3) find package
  const pkg = await prisma.package.findUnique({
    where: { id: payload.packageId },
  });
  if (!pkg || pkg.isDeleted)
    throw new ApiError(httpStatus.BAD_REQUEST, 'Package not found');

  // 4) Determine amount & billing cycle expiry
  const amount = pkg.price;
  const now = new Date();
  let expiredAt: Date;

  if (pkg.billingCycle === 'annually') {
    expiredAt = new Date(now);
    expiredAt.setFullYear(expiredAt.getFullYear() + 1);
  } else if (pkg.billingCycle === 'halfYearly') {
    expiredAt = new Date(now);
    expiredAt.setMonth(expiredAt.getMonth() + 6);
  } else if (pkg.billingCycle === 'monthly') {
    expiredAt = new Date(now);
    expiredAt.setMonth(expiredAt.getMonth() + 1);
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid billing cycle!');
  }

  // 5) Merge payload & create subscription inside transaction, update user's packageExpiry
  const finalType = payload.type ?? 'basic';

  const result = await prisma.$transaction(async tx => {
    const created = await tx.subscription.create({
      data: {
        userId: payload.userId,
        packageId: payload.packageId,
        type: finalType as any,
        transactionId: payload.transactionId ?? null,
        amount: amount,
        paymentStatus: payload.paymentStatus ?? 'unpaid',
        status: payload.status ?? 'pending',
        expiredAt: expiredAt,
      },
    });

    // compute finalExpiryDate if user already had packageExpiry in future
    let finalExpiryDate = expiredAt;
    if (user.packageExpiry && new Date(user.packageExpiry) > now) {
      const additionalMs = expiredAt.getTime() - now.getTime();
      finalExpiryDate = new Date(
        new Date(user.packageExpiry).getTime() + additionalMs,
      );
    }

    await tx.user.update({
      where: { id: user.id },
      data: { packageExpiry: finalExpiryDate },
    });

    return created;
  });

  // optionally notify admin or user here
  return result;
};

const getAllSubscription = async (
  params: ISubscriptionFilterRequest,
  options: IPaginationOptions,
  userId: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.SubscriptionWhereInput[] = [
    { userId, isDeleted: false },
  ];

  // Search across Subscription and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: subscriptionSearchAbleFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  // Filters
  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  const whereConditions: Prisma.SubscriptionWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.subscription.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? {
            [options.sortBy]: options.sortOrder,
          }
        : {
            createdAt: 'desc',
          },
  });

  const total = await prisma.subscription.count({
    where: whereConditions,
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const getSubscriptionById = async (id: string) => {
  const result = await prisma.subscription.findUnique({
    where: { id },
    include: {
      package: true,
      user: { select: { id: true, name: true, email: true, photoUrl: true } },
    },
  });

  if (!result || result.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Subscription not found !');
  }

  return result;
};

const updateSubscription = async (
  id: string,
  payload: Partial<ISubscription>,
) => {
  const subscription = await prisma.subscription.findUnique({ where: { id } });
  if (!subscription || subscription.isDeleted)
    throw new ApiError(httpStatus.NOT_FOUND, 'Subscription not found');

  const updated = await prisma.subscription.update({
    where: { id },
    data: payload,
  });

  if (!updated)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update subscription',
    );

  return updated;
};

const deleteSubscription = async (id: string) => {
  const subscription = await prisma.subscription.findUnique({ where: { id } });
  if (!subscription || subscription?.isDeleted)
    throw new ApiError(httpStatus.NOT_FOUND, 'Subscription not found');

  const result = await prisma.subscription.update({
    where: { id },
    data: { isDeleted: true },
  });

  return result;
};

export const subscriptionService = {
  createSubscription,
  getAllSubscription,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
};
