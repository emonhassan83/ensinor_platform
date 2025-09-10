import { CoursesStatus, Prisma, UserStatus, Wishlist } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IWishlist, IWishlistFilterRequest } from './wishlist.interface';
import { wishlistSearchAbleFields } from './wishlist.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';
type WishlistReference = { courseId?: string; bookId?: string };

const insertIntoDB = async (payload: IWishlist) => {
  const { userId, modelType, courseId, bookId } = payload;

  // 1️⃣ Validate user exists
  const user = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false, status: UserStatus.active },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found or inactive!');
  }

  // 2️⃣ Validate reference exists
  if (modelType === 'course') {
    if (!courseId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Course ID is required for course wishlist!',
      );
    }
    const course = await prisma.course.findFirst({
      where: { id: courseId, isDeleted: false, status: CoursesStatus.approved },
    });
    if (!course) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Course not found or not approved!',
      );
    }
  }

  if (modelType === 'book') {
    if (!bookId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Book ID is required for book wishlist!',
      );
    }
    const book = await prisma.book.findFirst({
      where: { id: bookId, isDeleted: false },
    });
    if (!book) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Book not found!');
    }
  }

  // 3️⃣ Check for duplicates
  const existing = await prisma.wishlist.findFirst({
    where: {
      userId,
      modelType,
      courseId: courseId ?? undefined,
      bookId: bookId ?? undefined,
    },
  });

  if (existing) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'This item is already in your wishlist!',
    );
  }

  // ✅ Insert into DB
  const result = await prisma.wishlist.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Wishlist creation failed!');
  }

  return result;
};

const getAllFromDB = async (
  params: IWishlistFilterRequest,
  options: IPaginationOptions,
  reference?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.WishlistWhereInput[] = [];

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: wishlistSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.WishlistWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.wishlist.findMany({
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
      course: {
        select: {
          id: true,
          title: true,
          shortDescription: true,
          thumbnail: true,
          language: true,
          level: true,
          lectures: true,
          price: true,
          author: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
            },
          },
        },
      },
      book: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
          description: true,
          writer: true,
          category: true,
          price: true,
          author: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
            },
          },
        },
      },
    },
  });

  const total = await prisma.wishlist.count({
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

const getByIdFromDB = async (id: string): Promise<Wishlist | null> => {
  const result = await prisma.wishlist.findUnique({
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
      course: {
        select: {
          id: true,
          title: true,
          shortDescription: true,
          thumbnail: true,
          language: true,
          level: true,
          lectures: true,
          price: true,
          author: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
            },
          },
        },
      },
      book: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
          description: true,
          writer: true,
          category: true,
          price: true,
          author: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
            },
          },
        },
      },
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Wishlist not found!');
  }
  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IWishlist>,
): Promise<Wishlist> => {
  const wishlist = await prisma.wishlist.findUnique({
    where: { id },
  });
  if (!wishlist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Wishlist not found!');
  }

  const result = await prisma.wishlist.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Wishlist not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<Wishlist> => {
  const wishlist = await prisma.wishlist.findUniqueOrThrow({
    where: { id },
  });
  if (!wishlist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Wishlist not found!');
  }

  const result = await prisma.wishlist.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Wishlist not deleted!');
  }

  return result;
};

const deleteByReferenceFromDB = async ({
  courseId,
  bookId,
}: WishlistReference): Promise<Wishlist> => {
  if (!courseId && !bookId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Either courseId or bookId must be provided!',
    );
  }

  // Build dynamic where condition
  const whereCondition: any = courseId ? { courseId } : { bookId };

  // Find the wishlist
  const wishlist = await prisma.wishlist.findFirst({ where: whereCondition });
  if (!wishlist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Wishlist not found!');
  }

  // Delete the wishlist
  const result = await prisma.wishlist.delete({ where: { id: wishlist.id } });
  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Wishlist deletion failed!');
  }

  return result;
};

export const WishlistService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
  deleteByReferenceFromDB,
};
