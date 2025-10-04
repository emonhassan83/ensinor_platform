import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import { IOrder, IOrderFilterRequest } from './orders.interface';
import { IPaginationOptions } from '../../interfaces/pagination';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { OrderStatus, Prisma } from '@prisma/client';
import { orderSearchAbleFields } from './orders.constants';
import prisma from '../../utils/prisma';
import {
  calculateRevenue,
  fetchEntity,
  validateAffiliate,
  validateCoupon,
  validatePromo,
} from './orders.utils';

const createOrders = async (payload: IOrder) => {
  const { orderData, items } = payload;

  // 1️⃣ Validate User
  const user = await prisma.user.findUnique({
    where: { id: orderData.userId },
  });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');

  let totalAmount = 0;
  let totalDiscount = 0;
  let coInstructorShare = 0;

  const orderItems: any[] = [];
  const authorSet = new Set<string>();
  const companySet = new Set<string>();
  const coInstructorIdsSet = new Set<string>();

  // 2️⃣ Process Each Item
  for (const item of items) {
    const entity = await fetchEntity(item.modelType, item.referenceId);
    if (!entity)
      throw new ApiError(httpStatus.NOT_FOUND, `${item.modelType} not found`);

    // Track author & company
    authorSet.add(entity.authorId);
    if (entity.companyId) companySet.add(entity.companyId);

    // Base price
    const basePrice = entity.price * (item.quantity || 1);
    let discount = 0;

    // Coupon
    if (orderData.couponCode) {
      const coupon = await validateCoupon(
        orderData.couponCode,
        // @ts-ignore
        item.modelType,
        item.referenceId,
      );
      discount += (basePrice * coupon.discount) / 100;
    }

    // Promo
    if (orderData.promoCode) {
      const promo = await validatePromo(
        orderData.promoCode,
        // @ts-ignore
        item.modelType,
        item.referenceId,
      );
      discount += (basePrice * promo.discount) / 100;
    }

    // Affiliate
    if (orderData.affiliateId) {
      const affiliate = await validateAffiliate(orderData.affiliateId);
      if (!affiliate)
        throw new ApiError(
          httpStatus.NOT_FOUND,
          'Affiliate invalid or inactive',
        );
    }

    const finalPrice = basePrice - discount;
    totalAmount += basePrice;
    totalDiscount += discount;

    // 🧮 Check if course has co-instructors
    if (item.modelType === 'course') {
      const course = await prisma.course.findUnique({
        where: { id: item.referenceId },
        include: { coInstructor: true },
      });

      if (course && course.coInstructor.length > 0) {
        const coInstructorCut = finalPrice * 0.35;
        coInstructorShare += coInstructorCut;
      }

      // Collect coInstructorIds
      course!.coInstructor.forEach(ci => {
        if (ci.isActive && !ci.isDeleted) {
          coInstructorIdsSet.add(ci.coInstructorId);
        }
      });
    }

    orderItems.push({
      modelType: item.modelType,
      bookId: item.modelType === 'book' ? item.referenceId : undefined,
      courseId: item.modelType === 'course' ? item.referenceId : undefined,
      bundleId:
        item.modelType === 'courseBundle' ? item.referenceId : undefined,
      eventId: item.modelType === 'event' ? item.referenceId : undefined,
      price: basePrice,
      discount,
      finalPrice,
      quantity: item.quantity || 1,
    });
  }

  const finalAmount = totalAmount - totalDiscount;

  // 3️⃣ Determine order-level authorId & companyId
  const orderAuthorId = authorSet.size === 1 ? Array.from(authorSet)[0] : null;
  const orderCompanyId =
    companySet.size === 1 ? Array.from(companySet)[0] : null;

  // 4️⃣ Revenue split
  const { instructorShare, platformShare, affiliateShare } = calculateRevenue(
    finalAmount,
    orderData,
  );

  // 5️⃣ Create Order
  const order = await prisma.order.create({
    data: {
      userId: orderData.userId,
      authorId: orderAuthorId,
      companyId: orderCompanyId,
      amount: totalAmount,
      discount: totalDiscount,
      finalAmount,
      instructorShare,
      platformShare,
      affiliateShare,
      coInstructorsShare: coInstructorShare,
      coInstructorIds: Array.from(coInstructorIdsSet),
      orderItem: { createMany: { data: orderItems } },
    },
    include: { orderItem: true },
  });

  return order;
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
      orderItem: {
        include: {
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
      orderItem: {
        include: {
          course: true,
          book: true,
          courseBundle: true,
        },
      },
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
