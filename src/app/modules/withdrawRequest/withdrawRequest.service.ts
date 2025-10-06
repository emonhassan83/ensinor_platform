import {
  PaymentMethod,
  Prisma,
  UserStatus,
  WithdrawPayoutType,
  WithdrawRequest,
  WithdrawStatus,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  IWithdrawRequest,
  IWithdrawRequestFilterRequest,
} from './withdrawRequest.interface';
import { withdrawRequestSearchAbleFields } from './withdrawRequest.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { endOfMonth, startOfMonth, subMonths } from 'date-fns';
import { sendWithdrawStatusNotifYToUser } from './withdrawRequest.utils';
import emailSender from '../../utils/emailSender';

const insertIntoDB = async (payload: IWithdrawRequest) => {
  const { userId, paymentMethod, amount } = payload;

  // 1️⃣ Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId, status: UserStatus.active, isDeleted: false },
    select: { id: true, balance: true },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');
  }

  // 1️⃣ Check if user has any pending withdraw request
  const pendingRequest = await prisma.withdrawRequest.findFirst({
    where: {
      userId,
      status: WithdrawStatus.pending,
    },
  });

  if (pendingRequest) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'You already have a pending withdraw request. Please wait until it is processed.',
    );
  }

  if (amount > user.balance) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Insufficient balance. Your current balance is $${user.balance.toFixed(
        2,
      )}, but you requested to withdraw $${amount.toFixed(2)}.`,
    );
  }

  // 2️⃣ If BankTransfer, check bank details
  if (paymentMethod === PaymentMethod.BankTransfer) {
    const bankDetail = await prisma.bankDetail.findFirst({
      where: {
        authorId: userId,
        isDeleted: false,
      },
    });

    if (!bankDetail) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Bank details not found. Please add your bank details before requesting a withdrawal.',
      );
    }
  }

  // 3️⃣ Create withdraw request
  const result = await prisma.withdrawRequest.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Withdraw request creation failed!',
    );
  }

  return result;
};

const getAllFromDB = async (
  params: IWithdrawRequestFilterRequest,
  options: IPaginationOptions,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.WithdrawRequestWhereInput[] = [];

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: withdrawRequestSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.WithdrawRequestWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.withdrawRequest.findMany({
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

  const total = await prisma.withdrawRequest.count({
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

const getAuthorPayout = async (
  params: IWithdrawRequestFilterRequest,
  options: IPaginationOptions,
  payoutType: WithdrawPayoutType,
  userId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.WithdrawRequestWhereInput[] = [{ payoutType }];
  if (userId) andConditions.push({ userId });

  if (Object.keys(filterData).length) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: { equals: (filterData as any)[key] },
      })),
    });
  }

  const whereConditions: Prisma.WithdrawRequestWhereInput = {
    AND: andConditions,
  };

  const withdrawHistory = await prisma.withdrawRequest.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: 'desc' },
  });

  const totalWithdrawRequests = await prisma.withdrawRequest.count({
    where: whereConditions,
  });

  // ---- 1️⃣ This Month Earning ----
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  let thisMonthEarning = 0;
  let totalBalance = 0;
  let lastMonthWithdraw = 0;

  if (payoutType === WithdrawPayoutType.author_payout) {
    // This month earning based on Payment.authorShare
    const thisMonthPayment = await prisma.payment.aggregate({
      _sum: { instructorShare: true },
      where: {
        authorId: userId,
        isPaid: true,
        isDeleted: false,
        createdAt: { gte: monthStart, lte: monthEnd },
      },
    });
    thisMonthEarning = thisMonthPayment._sum.instructorShare ?? 0;

    // Last month completed withdraw
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const lastMonthWithdrawAgg = await prisma.withdrawRequest.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        payoutType: WithdrawPayoutType.author_payout,
        status: WithdrawStatus.completed,
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
    });
    lastMonthWithdraw = lastMonthWithdrawAgg._sum.amount ?? 0;

    // Total balance from user balance field
    const user = await prisma.user.findUnique({ where: { id: userId } });
    totalBalance = user?.balance ?? 0;
  } else if (payoutType === WithdrawPayoutType.coInstructor_payout) {
    // This month earning based on CoInstructorEarning table
    const thisMonthEarningAgg = await prisma.coInstructorEarning.aggregate({
      _sum: { amount: true },
      where: {
        coInstructorId: userId,
        createdAt: { gte: monthStart, lte: monthEnd },
      },
    });
    thisMonthEarning = thisMonthEarningAgg._sum.amount ?? 0;

    // Last month completed withdraw
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const lastMonthWithdrawAgg = await prisma.withdrawRequest.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        payoutType: WithdrawPayoutType.coInstructor_payout,
        status: WithdrawStatus.completed,
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
    });
    lastMonthWithdraw = lastMonthWithdrawAgg._sum.amount ?? 0;

    // Total balance: sum of all CoInstructorEarning - all completed withdraw
    const totalEarningAgg = await prisma.coInstructorEarning.aggregate({
      _sum: { amount: true },
      where: { coInstructorId: userId },
    });
    const totalWithdrawAgg = await prisma.withdrawRequest.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        payoutType: WithdrawPayoutType.coInstructor_payout,
        status: WithdrawStatus.completed,
      },
    });

    totalBalance =
      (totalEarningAgg._sum.amount ?? 0) - (totalWithdrawAgg._sum.amount ?? 0);
  }

  return {
    meta: { page, limit, total: totalWithdrawRequests },
    data: {
      thisMonthEarning,
      lastMonthWithdraw,
      totalBalance,
      withdrawHistory,
    },
  };
};

const getByIdFromDB = async (id: string): Promise<WithdrawRequest | null> => {
  const result = await prisma.withdrawRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
        },
      },
    },
  });

  if (!result) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Oops! Withdraw request not found!',
    );
  }
  return result;
};

const updateIntoDB = async (
  id: string,
  payload: { status: WithdrawStatus },
): Promise<WithdrawRequest> => {
  const { status } = payload;

  // 1️⃣ Find the withdraw request
  const withdrawRequest = await prisma.withdrawRequest.findUnique({
    where: { id },
    include: { user: true }, // include user info for email + notify
  });

  if (!withdrawRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Withdraw request not found!');
  }

  // 2️⃣ Prevent redundant updates
  if (withdrawRequest.status === status) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Withdraw is already ${status}!`,
    );
  }

  // 3️⃣ Handle status transitions
  if (withdrawRequest.status === 'pending' && status === 'completed') {
    // --- Deduct balance ---
    const userBalance = withdrawRequest.user?.balance ?? 0;
    if (userBalance < withdrawRequest.amount) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient balance!');
    }

    await prisma.user.update({
      where: { id: withdrawRequest.userId },
      data: {
        balance: { decrement: withdrawRequest.amount },
      },
    });

    // --- Update status ---
    const result = await prisma.withdrawRequest.update({
      where: { id },
      data: { status },
    });

    // --- Send email ---
    await emailSender(
      withdrawRequest.user.email,
      'Withdrawal Approved ✅',
      `Your withdrawal of $${withdrawRequest.amount.toFixed(2)} has been approved and processed.`,
    );

    // --- Send notification ---
    await sendWithdrawStatusNotifYToUser('completed', withdrawRequest.user);

    return result;
  }

  if (withdrawRequest.status === 'pending' && status === 'cancelled') {
    // --- Update status ---
    const result = await prisma.withdrawRequest.update({
      where: { id },
      data: { status },
    });

    // --- Send notification ---
    await sendWithdrawStatusNotifYToUser('cancelled', withdrawRequest.user);

    return result;
  }

  // 4️⃣ Block other invalid transitions
  throw new ApiError(
    httpStatus.BAD_REQUEST,
    'Invalid status transition! You can only update from pending to completed or cancelled.',
  );
};

const deleteFromDB = async (id: string): Promise<WithdrawRequest> => {
  const withdrawRequest = await prisma.withdrawRequest.findUniqueOrThrow({
    where: { id },
  });
  if (!withdrawRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Withdraw request not found!');
  }

  const result = await prisma.withdrawRequest.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Withdraw request not deleted!');
  }

  return result;
};

export const WithdrawRequestService = {
  insertIntoDB,
  getAllFromDB,
  getAuthorPayout,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
