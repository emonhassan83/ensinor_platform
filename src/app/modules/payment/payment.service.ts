import Stripe from 'stripe';
import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import { IPayment, IPaymentFilterRequest } from './payment.interface';
import { IPaginationOptions } from '../../interfaces/pagination';
import { paginationHelpers } from '../../helpers/paginationHelper';
import {
  OrderStatus,
  PackageAudience,
  Payment,
  PaymentModelType,
  PaymentStatus,
  PaymentType,
  Prisma,
  SubscriptionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { paymentSearchAbleFields } from './payment.constants';
import prisma from '../../utils/prisma';
import config from '../../config';
import {
  createCheckoutSession,
  paymentNotifyToAdmin,
  paymentNotifyToUser,
} from './payment.utils';
import { findAdmin } from '../../utils/findAdmin';
import { generateTransactionId } from '../../utils/generateTransctionId';

const stripe = new Stripe(config.stripe?.stripe_api_secret as string, {
  apiVersion: '2025-08-27.basil',
  typescript: true,
});

const initiatePayment = async (payload: IPayment) => {
  const admin = await findAdmin();
  const transactionId = generateTransactionId();
  const { modelType, subscriptionId, orderId, userId } = payload;

  // 1. user validation
  const user = await prisma.user.findUnique({
    where: { id: userId, status: UserStatus.active, isDeleted: false },
  });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');

  // 2. load referenced model depending on modelType
  let model: any = null;
  let modelName = '';

  if (modelType === PaymentModelType.order) {
    modelName = PaymentModelType.order;
    model = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItem: true,
      },
    });
    if (!model) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found!');

    const orderAmount = Number(model.finalAmount ?? 0);
    if (orderAmount === 0) {
      return {
        message:
          'No payment required for this order. You can download the files.',
        order: model,
      };
    }

    payload.amount = orderAmount;
    payload.authorId = model.authorId;
    payload.companyId = model.companyId;
    payload.type = model.orderItem[0].modelType;
    payload.platformShare = model.platformShare;
    payload.instructorShare = model.instructorShare;
    payload.coInstructorsShare = model.coInstructorsShare;
  } else if (modelType === PaymentModelType.subscription) {
    modelName = PaymentModelType.subscription;

    model = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { package: true },
    });
    if (!model)
      throw new ApiError(httpStatus.NOT_FOUND, 'Subscription not found!');

    // Determine payment type based on package audience
    if (model.package.audience === PackageAudience.instructor) {
      payload.type = PaymentType.instructor_subscription;
    } else if (model.package.audience === PackageAudience.company_admin) {
      payload.type = PaymentType.company_subscription;
    }

    if (!admin?.id) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Admin ID not found',
      );
    }
    //  Platform gets 100% of subscription payments
    payload.authorId = admin.id;
    payload.amount = model.amount;
    payload.platformShare = model.amount;
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid modelType');
  }

  if (!model)
    throw new ApiError(httpStatus.NOT_FOUND, `${modelName} Not Found!`);

  // 3. Check existing unpaid payment for same reference + account
  let paymentData = await prisma.payment.findFirst({
    where: {
      modelType,
      userId,
      isPaid: false,
      ...(orderId ? { orderId } : {}),
      ...(subscriptionId ? { subscriptionId } : {}),
    },
  });

  if (paymentData) {
    // update transactionId if necessary
    paymentData = await prisma.payment.update({
      where: { id: paymentData.id },
      data: { transactionId },
    });
  } else {
    // create new payment
    const amount = Number(payload.amount ?? 0);
    const createPayload: any = {
      ...payload,
      transactionId,
      amount,
      status: PaymentStatus.unpaid,
      isPaid: false,
      authorId: payload.authorId ?? null,
    };

    paymentData = await prisma.payment.create({ data: createPayload });
  }

  if (!paymentData)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to create payment',
    );

  // 4) create checkout session (your createCheckoutSession should use Stripe client)
  const checkoutSessionUrl = await createCheckoutSession({
    product: {
      amount: paymentData.amount,
      name:
        modelType === PaymentModelType.subscription
          ? (model?.package?.title ?? 'User Subscription')
          : modelType === PaymentModelType.order
            ? 'Order Payment'
            : '',

      quantity: 1,
    },
    paymentId: paymentData.id,
  });

  return checkoutSessionUrl;
};

const confirmPayment = async (query: Record<string, any>) => {
  const { sessionId, paymentId } = query;
  if (!sessionId || !paymentId)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'sessionId and paymentId are required',
    );

  // retrieve session from stripe
  const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
  const paymentIntentId = stripeSession.payment_intent as string;

  if (stripeSession.status !== 'complete') {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Payment session is not completed',
    );
  }

  // Prisma transaction
  try {
    const result = await prisma.$transaction(async tx => {
      // 1. Update payment record
      const payment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          isPaid: true,
          status: PaymentStatus.paid,
          paymentIntentId,
          updatedAt: new Date(),
        },
      });
      if (!payment)
        throw new ApiError(httpStatus.NOT_FOUND, 'Payment Not Found!');

      // handle each modelType
      if (payment.modelType === PaymentModelType.order) {
        // 2️. Handle Order Payment Logic
        const order = await tx.order.findUnique({
          where: { id: payment.orderId ?? undefined },
        });
        if (!order)
          throw new ApiError(httpStatus.NOT_FOUND, 'Order not found!');

        // --- (1a) Platform owner (Super Admin) balance update ---
        const superAdmin = await tx.user.findFirst({
          where: { role: UserRole.super_admin, isDeleted: false },
        });
        if (superAdmin) {
          await tx.user.update({
            where: { id: superAdmin.id },
            data: {
              balance: {
                increment: Math.round(payment.platformShare * 10) / 10 || 0,
              },
            },
          });
        }

        // --- (1b) Author balance update ---
        if (payment.authorId) {
          await tx.user.update({
            where: { id: payment.authorId },
            data: {
              balance: {
                increment: Math.round((payment.instructorShare || 0) * 10) / 10,
              },
            },
          });
        }

        // --- (1c) Co-instructors balance update (if any) ---
        if (order.coInstructorIds && order.coInstructorIds.length > 0) {
          const coInstructors = order.coInstructorIds;
          const totalCoShare = payment.coInstructorsShare || 0;
          const individualShare =
            coInstructors.length > 0
              ? Math.round((totalCoShare / coInstructors.length) * 10) / 10
              : 0;

          // Update each co-instructor balance
          for (const coId of coInstructors) {
            await tx.user.update({
              where: { id: coId },
              data: { balance: { increment: individualShare } },
            });

            // (2️⃣) Insert CoInstructorEarning record
            await tx.coInstructorEarning.create({
              data: {
                coInstructorId: coId,
                paymentId: payment.id,
                amount: individualShare,
              },
            });
          }
        }

        // 3. Update Order Payment Status ---
        await tx.order.update({
          where: { id: order.id },
          data: {
            transactionId: payment.transactionId,
            paymentStatus: PaymentStatus.paid,
            status: OrderStatus.completed,
            isDeleted: false,
          },
        });
      } else if (payment.modelType === PaymentModelType.subscription) {
        const sub = await tx.subscription.update({
          where: { id: payment.subscriptionId ?? undefined },
          data: {
            transactionId: payment.transactionId,
            paymentStatus: PaymentStatus.paid,
            status: SubscriptionStatus.active,
            isExpired: false,
          },
          include: { package: true, user: true },
        });

        if (!sub)
          throw new ApiError(httpStatus.NOT_FOUND, 'Subscription not found!');

        // compute expiry based on package.billingCycle
        const now = new Date();
        const billingCycleDays =
          sub.package?.billingCycle === 'annually'
            ? 365
            : sub.package?.billingCycle === 'halfYearly'
              ? 180
              : 30;

        let newExpiry = new Date(
          now.getTime() + billingCycleDays * 24 * 60 * 60 * 1000,
        );

        // --- Find if user already has active subscription ---
        const existingSub = await tx.subscription.findFirst({
          where: {
            userId: sub.userId,
            id: { not: sub.id },
            isExpired: false,
            isDeleted: false,
            paymentStatus: PaymentStatus.paid,
          },
        });

        if (existingSub) {
          const remainingDays =
            existingSub.expiredAt && existingSub.expiredAt > now
              ? Math.ceil(
                  (existingSub.expiredAt.getTime() - now.getTime()) /
                    (1000 * 60 * 60 * 24),
                )
              : 0;

          const totalDays = billingCycleDays + remainingDays;
          const extendedExpiry = new Date(
            now.getTime() + totalDays * 24 * 60 * 60 * 1000,
          );

          // Mark previous as expired but preserve for record
          await tx.subscription.update({
            where: { id: existingSub.id },
            data: {
              isExpired: true,
              isDeleted: true,
              status: SubscriptionStatus.expired,
            },
          });

          // Update new subscription expiry
          newExpiry = extendedExpiry;
          await tx.subscription.update({
            where: { id: sub.id },
            data: { expiredAt: newExpiry },
          });
        } else {
          // Set expiry for first-time subscription
          await tx.subscription.update({
            where: { id: sub.id },
            data: { expiredAt: newExpiry },
          });
        }

        // --- 1️⃣ Company activation logic ---
        if (sub.package.audience === PackageAudience.company_admin) {
          const companyAdmin = await tx.companyAdmin.findUnique({
            where: { userId: sub.userId },
            include: { company: true },
          });

          if (companyAdmin?.company) {
            await tx.company.update({
              where: { id: companyAdmin.company.id },
              data: { isActive: true },
            });
          }
        }

        // --- Update user's package expiry ---
        await tx.user.update({
          where: { id: sub.userId },
          data: { packageExpiry: newExpiry },
        });

        // --- Increment package popularity ---
        if (sub.packageId) {
          await tx.package.update({
            where: { id: sub.packageId },
            data: { popularity: { increment: 1 } },
          });
        }
      }

      // notify users & admin
      await paymentNotifyToUser('SUCCESS', payment);
      await paymentNotifyToAdmin('SUCCESS', payment);

      return payment;
    });

    return result;
  } catch (error: any) {
    // attempt to refund the intent if available
    try {
      if ((error as any).paymentIntentId) {
        await stripe.refunds.create({
          payment_intent: (error as any).paymentIntentId,
        });
      }
    } catch (refundErr) {
      console.error(
        'Refund attempt failed after processing error:',
        (refundErr as Error).message,
      );
    }
    throw new ApiError(
      httpStatus.BAD_GATEWAY,
      error.message || 'Payment confirmation failed',
    );
  }
};

const getAllIntoDB = async (
  params: IPaymentFilterRequest,
  options: IPaginationOptions,
  filterBy?: { authorId?: string; userId?: string },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.PaymentWhereInput[] = [{ isDeleted: false }];

  // Filter either by authorId or userId
  if (filterBy && filterBy.authorId) {
    andConditions.push({ authorId: filterBy.authorId });
  }
  if (filterBy && filterBy.userId) {
    andConditions.push({ userId: filterBy.userId });
  }

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: paymentSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.PaymentWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.payment.findMany({
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
      account: {
        select: {
          name: true,
        },
      },
      author: {
        select: {
          name: true,
        },
      },
    },
  });

  const total = await prisma.payment.count({
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

const getByIdIntoDB = async (id: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id, isDeleted: false },
    include: {
      account: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNo: true,
          photoUrl: true,
        },
      },
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNo: true,
          photoUrl: true,
        },
      },
      order: true,
      subscription: true,
    },
  });

  if (!payment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Payment not found');
  }
  return payment;
};

const updateIntoDB = async (id: string, payload: Partial<Payment>) => {
  const payment = await prisma.payment.findUnique({
    where: { id, isDeleted: false },
  });
  if (!payment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Payment not found');
  }

  const updated = await prisma.payment.update({
    where: { id },
    data: payload,
    include: {
      account: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNo: true,
          photoUrl: true,
        },
      },
    },
  });

  if (!updated) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Payment updating failed');
  }
  return updated;
};

const deleteIntoDB = async (id: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id, isDeleted: false },
  });
  if (!payment) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Payment already deleted!');
  }

  const result = await prisma.payment.update({
    where: { id },
    data: {
      isDeleted: true,
    },
    include: {
      account: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNo: true,
          photoUrl: true,
        },
      },
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Payment deleting failed');
  }
  return result;
};

const refundPayment = async (payload: {
  intendId?: string;
  amount?: number;
}) => {
  if (!payload?.intendId)
    throw new ApiError(httpStatus.BAD_REQUEST, 'Payment intent ID is required');

  // find payment by paymentIntentId
  const payment = await prisma.payment.findFirst({
    where: { paymentIntentId: payload.intendId },
  });
  if (!payment) throw new ApiError(httpStatus.NOT_FOUND, 'Payment not found');

  // Only allow refund for orders (adapt logic if you allow other types)
  if (payment.modelType !== PaymentModelType.order) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Only order-related payments are eligible for refund.',
    );
  }

  // validate order status
  const order = await prisma.order.findUnique({
    where: { id: payment.orderId ?? undefined },
  });
  if (!order)
    throw new ApiError(httpStatus.NOT_FOUND, 'Booking record not found');
  if (order.status !== 'cancelled') {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Only cancelled order can be refunded. Please cancel the order first.',
    );
  }

  // perform DB updates in transaction + Stripe refund
  try {
    const response = await prisma.$transaction(async tx => {
      // update order paymentStatus
      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'refunded' },
      });

      // update payment
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'refunded', isPaid: false },
      });

      // call Stripe refund
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: payload.intendId,
        ...(payload.amount ? { amount: Math.round(payload.amount * 100) } : {}),
      };
      // call stripe outside transaction (stripe network call)
      return { updatedPayment, refundParams };
    });

    // call stripe refund outside DB transaction
    const stripeResp = await stripe.refunds.create(response.refundParams);

    // notifications
    // await paymentNotifyToUser('REFUND', payment);
    // await paymentNotifyToAdmin('REFUND', payment);

    return stripeResp;
  } catch (err: any) {
    console.error('Refund Error:', err);
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      err.message || 'Refund processing failed',
    );
  }
};

export const PaymentService = {
  initiatePayment,
  confirmPayment,
  getAllIntoDB,
  getByIdIntoDB,
  updateIntoDB,
  deleteIntoDB,
  refundPayment,
};
