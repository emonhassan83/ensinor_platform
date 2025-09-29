import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import prisma from '../../utils/prisma';
import { IPaginationOptions } from '../../interfaces/pagination';
import { BookStatus, CartModelType, CoursesStatus, Prisma, UserRole, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { cartSearchableFields } from './cart.constant';
import { ICart, ICartFilterRequest } from './cart.interface';

const insertIntoDB = async (payload: ICart) => {
  const { userId, bookId, courseId, modelType } = payload;

  const author = await prisma.user.findFirst({
    where: {
      id: userId,
      role: UserRole.super_admin,
      status: UserStatus.active,
      isDeleted: false,
    },
  });
  if (!author) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');
  }

    // === Validate book or course existence ===
  let book: any = null;
  let course: any = null;

  if (bookId) {
    book = await prisma.book.findFirst({
      where: { id: bookId, status: BookStatus.published, isDeleted: false },
    });
    if (!book) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Book not found!');
    }
  }

  if (courseId) {
    course = await prisma.course.findFirst({
      where: { id: courseId, status: CoursesStatus.approved, isDeleted: false },
    });
    if (!course) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Course not found!');
    }
  }


  // === Check if the item already exists in the cart ===
  const existingCart = await prisma.cart.findFirst({
    where: {
      userId,
    },
    include: { book: true, course: true },
  });

  if (existingCart) {
    // === Rule 1: Prevent mixed modelTypes ===
    if (existingCart.modelType !== modelType) {
      await prisma.cart.deleteMany({ where: { userId } });
    } else {
      // === Rule 2: If course but different authorId or instructorId, replace ===
      if (modelType === CartModelType.course && course) {
        if (
          existingCart.course?.authorId !== course.authorId ||
          existingCart.course?.instructorId !== course.instructorId ||
          existingCart.course?.companyId !== course.companyId
        ) {
          await prisma.cart.deleteMany({ where: { userId } });
        }
      }

      // === Rule 3 (Modified): If book but different authorId OR companyId, replace ===
      if (modelType === CartModelType.book && book) {
        if (
          existingCart.book?.authorId !== book.authorId ||
          existingCart.book?.companyId !== book.companyId
        ) {
          await prisma.cart.deleteMany({ where: { userId } });
        }
      }
    }
  }

  const result = await prisma.cart.create({
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Article creation failed!');
  }

  return result;
};

const getAllFromDB = async (
  filters: ICartFilterRequest,
  options: IPaginationOptions,
  userId: string,
) => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.CartWhereInput[] = [];
  if (userId) {
    andConditions.push({ userId });
  }

  if (searchTerm) {
    andConditions.push({
      OR: cartSearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  const whereConditions: Prisma.CartWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.cart.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: 'desc',
          },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
          price: true,
          avgRating: true,
          ratingCount: true,
          createdAt: true,
          instructor: {
            select: {
              name: true,
            },
          },
        },
      },
      book: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
          category: true,
          price: true,
          createdAt: true,
          author: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
  const total = await prisma.cart.count({
    where: whereConditions,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

const getByIdFromDB = async (id: string) => {
  const result = await prisma.cart.findUnique({
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
      course: true,
      book: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Book not found!');
  }
  return result;
};

const deleteFromDB = async (id: string) => {
  const cart = await prisma.cart.findUnique({
    where: { id },
  });
  if (!cart) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cart not found!');
  }

  const result = await prisma.cart.delete({
    where: { id },
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cart deletion failed');
  }
  return result;
};

export const CartServices = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  deleteFromDB,
};
