import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import cron from 'node-cron';
import prisma from '../../utils/prisma';
import {
  PackageAudience,
  PaymentStatus,
  Prisma,
  SubscriptionStatus,
  UserStatus,
} from '@prisma/client';
import {
  ISubscription,
  ISubscriptionFilterRequest,
} from './subscription.interface';
import { IPaginationOptions } from '../../interfaces/pagination';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { subscriptionSearchAbleFields } from './subscription.constants';
import { subscriptionNotifyToUser } from './subscription.utils';

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

      for (const sub of expiringToday) {
        await subscriptionNotifyToUser('WARNING', sub.package, sub.user);
        console.log(
          `⚠️ Warning sent to user ${sub.userId} for package ${sub.packageId}`,
        );
      }

      // 2) Mark as expired (expiredAt < today)
      const alreadyExpired = await prisma.subscription.findMany({
        where: {
          expiredAt: { lt: today },
          isExpired: false,
          paymentStatus: PaymentStatus.paid,
        },
        include: { user: true, package: true },
      });

      if (alreadyExpired.length > 0) {
        // update in a transaction
        await prisma.$transaction(
          alreadyExpired.map(s =>
            prisma.subscription.update({
              where: { id: s.id },
              data: {
                isExpired: true,
                isDeleted: true,
                status: SubscriptionStatus.expired,
              },
            }),
          ),
        );

        // --- Handle expired users & companies ---
        for (const sub of alreadyExpired) {
          const user = sub.user;

          // Send notification
          await subscriptionNotifyToUser('EXPIRED', sub.package, sub.user);

          // Clear package expiry if applicable
          if (user?.packageExpiry && user.packageExpiry <= new Date()) {
            await prisma.user.update({
              where: { id: user.id },
              data: { packageExpiry: null },
            });
          }

          // --- 🏢 If audience is company_admin, deactivate company ---
          if (sub.package.audience === PackageAudience.company_admin) {
            const companyAdmin = await prisma.companyAdmin.findUnique({
              where: { userId: user.id },
              include: { company: true },
            });

            if (companyAdmin?.company) {
              await prisma.company.update({
                where: { id: companyAdmin.company.id },
                data: { isActive: false },
              });
              console.log(
                `🏢 Company "${companyAdmin.company.name}" deactivated due to expired subscription for admin ${user.id}`,
              );
            }
          }

          console.log(`❌ Expired notification sent to user ${sub.userId}`);
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
      paymentStatus: PaymentStatus.unpaid,
      status: SubscriptionStatus.pending,
    },
  });

  if (existingUnpaid) {
    return existingUnpaid;
  }

  // 2) find user
  const user = await prisma.user.findFirst({
    where: { id: payload.userId, status: UserStatus.active, isDeleted: false },
  });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');

  // 3) find package
  const pkg = await prisma.package.findFirst({
    where: { id: payload.packageId, isDeleted: false },
  });
  if (!pkg) throw new ApiError(httpStatus.BAD_REQUEST, 'Package not found');

  // another validation
  if (pkg.audience !== user.role) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'This subscription not allow for you!',
    );
  }

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
  const finalType = pkg.type ?? 'basic';

  const result = await prisma.$transaction(async tx => {
    const created = await tx.subscription.create({
      data: {
        userId: user.id,
        packageId: pkg.id,
        type: finalType as any,
        amount: amount,
        paymentStatus: payload.paymentStatus ?? 'unpaid',
        status: payload.status ?? 'pending',
        expiredAt: expiredAt,
      },
    });

    return created;
  });

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
    {
      userId,
      status: SubscriptionStatus.active,
      isExpired: false,
      paymentStatus: PaymentStatus.paid,
      isDeleted: false,
    },
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
    include: {
      package: {
        select: {
          title: true,
          type: true,
          billingCycle: true,
        },
      },
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
