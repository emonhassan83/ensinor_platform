import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import { IOrder, IOrderFilterRequest } from './orders.interface';
import { IPaginationOptions } from '../../interfaces/pagination';
import { paginationHelpers } from '../../helpers/paginationHelper';
import {
  OrderModelType,
  OrderStatus,
  Prisma,
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
  const { userId, modelType } = payload;

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

  // ✅ Special case for book documents and assign author
  if (modelType === OrderModelType.book) {
    payload.documents = entity.file;
  }
  if (modelType === OrderModelType.course) {
    payload.authorId = entity.instructorId;
  } else {
    payload.authorId = entity.authorId;
  }

  // ✅ Assign price & author
  payload.amount = entity[config.priceField];

  // ✅ Increment popularity (atomic update)
  await config.model.update({
    where: { id: referenceId },
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
          title: true,
          category: true,
        },
      },
      courseBundle: {
        select: {
          title: true,
          category: true,
        },
      },
      book: {
        select: {
          title: true,
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
