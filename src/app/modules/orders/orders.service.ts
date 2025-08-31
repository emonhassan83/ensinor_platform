import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import { IOrder, IOrderFilterRequest } from './orders.interface';
import { IPaginationOptions } from '../../interfaces/pagination';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { OrderModelType, Prisma, UserStatus } from '@prisma/client';
import { orderSearchAbleFields } from './orders.constants';
import prisma from '../../utils/prisma';

const modelConfig: Record<OrderModelType, {
  model: any; // or proper delegate type
  priceField: string;
  popularityField: string;
}> = {
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
};


const createOrders = async (payload: IOrder) => {
  const { userId, modelType, reference } = payload;

  // ✅ Validate user
  const user = await prisma.user.findUnique({
    where: { id: userId, status: UserStatus.active },
  });

  if (!user || user?.isDeleted) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User does not exist!');
  }

  // ✅ Get config for the model
  const config = modelConfig[modelType];
  if (!config) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid order model type!');
  }

  // ✅ Fetch referenced entity
  const entity = await config.model.findFirst({
    where: { id: reference, isDeleted: false },
  });

  if (!entity) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Reference ${modelType} does not exist!`);
  }

  // ✅ Assign price
  payload.amount = entity[config.priceField];

  // ✅ Increment popularity (atomic update)
  await config.model.update({
    where: { id: reference },
    data: {
      [config.popularityField]: { increment: 1 },
    },
  });

  // ✅ Create the order
  const result = await prisma.order.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Shop order creation failed!');
  }

  return result;
};

const getAllOrders = async (
  params: IOrderFilterRequest,
  options: IPaginationOptions,
  userId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.OrderWhereInput[] = [
    { userId, isDeleted: false },
  ];

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
    where: { id },
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

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }
  return order;
};

const updateOrders = async (id: string, payload: Partial<IOrder>) => {
  const order = await prisma.order.findUnique({
    where: { id },
  });
  if (!order || order?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }
  const updated = await prisma.order.update({
    where: { id },
    data: payload,
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
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.isDeleted) {
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
