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
import {
  sendWithdrawApprovedEmail,
  sendWithdrawCancelledEmail,
  sendWithdrawCompletedEmail,
  sendWithdrawStatusNotifYToUser,
} from './withdrawRequest.utils';
import httpStatus from 'http-status';

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

  // ?? Search filter
  if (searchTerm) {
    andConditions.push({
      OR: withdrawRequestSearchAbleFields.map(field => ({
        [field]: { contains: searchTerm, mode: 'insensitive' },
      })),
    });
  }

  // ?? Apply filter conditions
  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: { equals: (filterData as any)[key] },
      })),
    });
  }

  const whereConditions: Prisma.WithdrawRequestWhereInput = { AND: andConditions };

  // ?? Fetch withdraw list
  const withdrawRequestList = await prisma.withdrawRequest.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: 'desc' },
  });

  const total = await prisma.withdrawRequest.count({ where: whereConditions });

  // ?? Calculate totals
  const totalWithdrawAgg = await prisma.withdrawRequest.aggregate({
    _sum: { amount: true },
    where: { status: 'completed' },
  });
  const totalWithdraw = totalWithdrawAgg._sum.amount || 0;

  // ?? Last month completed withdrawals
  const now = new Date();
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const lastMonthWithdrawAgg = await prisma.withdrawRequest.aggregate({
    _sum: { amount: true },
    where: {
      status: 'completed',
      createdAt: {
        gte: firstDayLastMonth,
        lte: lastDayLastMonth,
      },
    },
  });
  const lastMonthWithdraw = lastMonthWithdrawAgg._sum.amount || 0;

  // ?? Pending withdrawals
  const pendingWithdrawAgg = await prisma.withdrawRequest.aggregate({
    _sum: { amount: true },
    where: { status: 'pending' },
  });
  const pendingWithdraw = pendingWithdrawAgg._sum.amount || 0;

  // ?? Final response format
  return {
    meta: {
      page,
      limit,
      total,
    },
    data: {
      totalWithdraw,
      lastMonthWithdraw,
      pendingWithdraw,
      withdrawRequestList,
    },
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
    include: { user: true },
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
  switch (status) {
    // ✅ Super Admin approves the withdraw request
    case 'approved':
      if (withdrawRequest.status !== 'pending') {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Only pending requests can be approved!',
        );
      }

      await prisma.withdrawRequest.update({
        where: { id },
        data: { status },
      });

      // sent notification and email
      await sendWithdrawApprovedEmail(
        withdrawRequest.user,
        withdrawRequest.amount,
      );
      await sendWithdrawStatusNotifYToUser(
        'approved',
        withdrawRequest.user,
        withdrawRequest.amount,
      );
      break;

    // ✅ Payout completed
    case 'completed':
      if (withdrawRequest.status !== 'approved') {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Only approved requests can be completed!',
        );
      }

      const userBalance = withdrawRequest.user?.balance ?? 0;
      if (userBalance < withdrawRequest.amount) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient balance!');
      }

      await prisma.user.update({
        where: { id: withdrawRequest.userId },
        data: { balance: { decrement: withdrawRequest.amount } },
      });

      const completedResult = await prisma.withdrawRequest.update({
        where: { id },
        data: { status },
      });

      // sent email and notification
      await sendWithdrawCompletedEmail(
        withdrawRequest.user,
        withdrawRequest.amount,
        userBalance - withdrawRequest.amount,
      );
      await sendWithdrawStatusNotifYToUser(
        'completed',
        withdrawRequest.user,
        withdrawRequest.amount,
      );
      return completedResult;

    // ✅ Cancelled by user or admin
    case 'cancelled':
      if (withdrawRequest.status === 'completed') {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Completed withdrawals cannot be cancelled!',
        );
      }

      const cancelledResult = await prisma.withdrawRequest.update({
        where: { id },
        data: { status },
      });

      // sent email and notification
      await sendWithdrawCancelledEmail(
        withdrawRequest.user,
        withdrawRequest.amount,
      );
      await sendWithdrawStatusNotifYToUser(
        'cancelled',
        withdrawRequest.user,
        withdrawRequest.amount,
      );
      return cancelledResult;

    default:
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid status update!');
  }

  return withdrawRequest;
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
