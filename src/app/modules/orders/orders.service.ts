import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import { IOrder, IOrderFilterRequest } from './orders.interface';
import { IPaginationOptions } from '../../interfaces/pagination';
import { paginationHelpers } from '../../helpers/paginationHelper';
import {
  Coupon,
  OrderModelType,
  OrderStatus,
  Prisma,
  PromoCode,
  UserStatus,
} from '@prisma/client';
import { orderSearchAbleFields } from './orders.constants';
import prisma from '../../utils/prisma';

const modelConfig: Record<
  OrderModelType,
  {
    model: any; // or proper delegate type
    priceField: string;
    popularityField: string;
  }
> = {
  [OrderModelType.book]: {
    model: prisma.book,
    priceField: 'price',
    popularityField: 'popularity',
  },
  [OrderModelType.course]: {
    model: prisma.course,
    priceField: 'price',
    popularityField: 'popularity',
  },
  [OrderModelType.courseBundle]: {
    model: prisma.courseBundle,
    priceField: 'price',
    popularityField: 'popularity',
  },
  [OrderModelType.event]: {
    model: prisma.event,
    priceField: 'price',
    popularityField: 'popularity',
  },
};

const createOrders = async (payload: IOrder) => {
  const { userId, modelType, couponCode, promoCode, affiliateId } = payload;

  // ✅ Validate user
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
      status: UserStatus.active,
      isDeleted: false,
    },
  });
  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User does not exist!');
  }

  // ✅ Get config for the model
  const config = modelConfig[modelType];
  if (!config) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid order model type!');
  }

  // ✅ Resolve reference ID
  let referenceId: string | undefined;
  if (modelType === OrderModelType.book) referenceId = payload.bookId;
  if (modelType === OrderModelType.course) referenceId = payload.courseId;
  if (modelType === OrderModelType.courseBundle)
    referenceId = payload.courseBundleId;

  if (!referenceId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Reference ID is required');
  }

  // ✅ Fetch referenced entity
  const entity = await config.model.findFirst({
    where: { id: referenceId, isDeleted: false },
  });
  if (!entity) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Reference ${modelType} does not exist!`,
    );
  }
  if (modelConfig.book) {
    payload.documents = entity.file;
  }

  let baseAmount = entity[config.priceField];
  let discount = 0;
  let finalAmount = baseAmount;

  // ✅ Coupon/Promo Validation
  let isInstructorCoupon = false;
  let isInstructorPromo = false;

  if (couponCode) {
    const coupon: Coupon | null = await prisma.coupon.findFirst({
      where: {
        code: couponCode,
        isActive: true,
        expireAt: { gte: new Date() },
      },
    });
    if (!coupon)
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid/Expired coupon!');

    // Now check usage
    if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon usage limit reached!');
    }

    discount = (baseAmount * coupon.discount) / 100;
    finalAmount = baseAmount - discount;

    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    });

    // Check if instructor promo
    isInstructorCoupon = coupon.authorId === payload.authorId;
  }

  if (promoCode) {
    const promo: PromoCode | null = await prisma.promoCode.findFirst({
      where: {
        code: promoCode,
        isActive: true,
        expireAt: { gte: new Date() },
      },
    });
    if (!promo)
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid/Expired promo!');

    if (promo.maxUsage && promo.usedCount >= promo.maxUsage) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Promo code usage limit reached!',
      );
    }

    discount = (baseAmount * promo.discount) / 100;
    finalAmount = baseAmount - discount;

    await prisma.promoCode.update({
      where: { id: promo.id },
      data: { usedCount: { increment: 1 } },
    });

    isInstructorPromo = promo.authorId === payload.authorId;
  }

  // ✅ Revenue Split Logic
  let instructorShare = 0;
  let platformShare = 0;
  let affiliateShare = 0;

  if (affiliateId) {
    const affiliateCut = finalAmount * 0.2; // 20%
    affiliateShare = affiliateCut;
    const remaining = finalAmount - affiliateCut;
    instructorShare = remaining * 0.5;
    platformShare = remaining * 0.5;
  } else if (isInstructorPromo || promoCode) {
    instructorShare = finalAmount * 0.97;
    platformShare = finalAmount * 0.03;
  } else if (isInstructorCoupon || couponCode) {
    // Coupon usage always 50/50
    instructorShare = finalAmount * 0.5;
    platformShare = finalAmount * 0.5;
  } else {
    // Regular promo or no promo
    instructorShare = finalAmount * 0.5;
    platformShare = finalAmount * 0.5;
  }

  // 8️⃣ Create order
  const orderData = {
    userId,
    authorId: entity.authorId,
    modelType,
    bookId: payload.bookId,
    courseId: payload.courseId,
    courseBundleId: payload.courseBundleId,
    eventId: payload.eventId,
    amount: baseAmount,
    discount,
    finalAmount,
    instructorShare,
    platformShare,
    affiliateShare,
    transactionId: payload.transactionId,
    documents: payload.documents,
  };

  const result = await prisma.order.create({ data: orderData });
  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Shop order creation failed!');
  }

  return result;
};

const getAllOrders = async (
  params: IOrderFilterRequest,
  options: IPaginationOptions,
  filterBy: { authorId?: string; userId?: string },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.OrderWhereInput[] = [{ isDeleted: false }];

  // Filter either by authorId or userId
  if (filterBy.authorId) {
    andConditions.push({ authorId: filterBy.authorId });
  }
  if (filterBy.userId) {
    andConditions.push({ userId: filterBy.userId });
  }

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: orderSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.OrderWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.order.findMany({
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
      user: {
        select: {
          name: true,
        },
      },
      author: {
        select: {
          name: true,
        },
      },
      course: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
          category: true,
        },
      },
      courseBundle: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
          category: true,
        },
      },
      book: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
          category: true,
        },
      },
    },
  });

  const total = await prisma.order.count({
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

const getOrdersById = async (id: string) => {
  const order = await prisma.order.findUnique({
    where: { id, isDeleted: false },
    include: {
      user: {
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
      course: true,
      book: true,
      courseBundle: true,
    },
  });

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }
  return order;
};

const updateOrders = async (id: string, payload: { status: OrderStatus }) => {
  const { status } = payload;

  const order = await prisma.order.findUnique({
    where: { id, isDeleted: false },
  });
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status },
    include: {
      user: {
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
    throw new ApiError(httpStatus.BAD_REQUEST, 'Order updating failed');
  }
  return updated;
};

const deleteOrders = async (id: string) => {
  const order = await prisma.order.findUnique({
    where: { id, isDeleted: false },
  });
  if (!order) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Order already deleted!');
  }

  const result = await prisma.order.update({
    where: { id },
    data: {
      isDeleted: true,
    },
    include: {
      user: {
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
    throw new ApiError(httpStatus.BAD_REQUEST, 'Order deleting failed');
  }
  return result;
};

export const ordersService = {
  createOrders,
  getAllOrders,
  getOrdersById,
  updateOrders,
  deleteOrders,
};
