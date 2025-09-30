import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import prisma from '../../utils/prisma';
import {
  BookStatus,
  CartModelType,
  CoursesStatus,
  UserStatus,
} from '@prisma/client';
import { ICart } from './cart.interface';

const insertIntoDB = async (payload: ICart) => {
  const { userId, bookId, courseId, bundleCourseId, modelType } = payload;

  // === Validate user ===
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      status: UserStatus.active,
      isDeleted: false,
    },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');
  }

  // === Validate item based on modelType ===
  let book: any = null;
  let course: any = null;
  let bundleCourse: any = null;

  if (modelType === CartModelType.book) {
    if (!bookId) throw new ApiError(httpStatus.BAD_REQUEST, 'BookId required!');
    book = await prisma.book.findFirst({
      where: { id: bookId, status: BookStatus.published, isDeleted: false },
    });
    if (!book) throw new ApiError(httpStatus.NOT_FOUND, 'Book not found!');
  }

  if (modelType === CartModelType.course) {
    if (!courseId)
      throw new ApiError(httpStatus.BAD_REQUEST, 'CourseId required!');
    course = await prisma.course.findFirst({
      where: { id: courseId, status: CoursesStatus.approved, isDeleted: false },
    });
    if (!course) throw new ApiError(httpStatus.NOT_FOUND, 'Course not found!');
  }

  if (modelType === CartModelType.courseBundle) {
    if (!bundleCourseId)
      throw new ApiError(httpStatus.BAD_REQUEST, 'bundleCourseId required!');
    bundleCourse = await prisma.courseBundle.findFirst({
      where: { id: bundleCourseId, isDeleted: false },
    });
    if (!bundleCourse)
      throw new ApiError(httpStatus.NOT_FOUND, 'Course Bundle not found!');
  }

  // === Prevent duplicate in cart ===
  const existingCart = await prisma.cart.findFirst({
    where: {
      userId,
      ...(bookId ? { bookId } : {}),
      ...(courseId ? { courseId } : {}),
      ...(bundleCourseId ? { bundleCourseId } : {}),
      modelType
    },
  });

  if (existingCart) {
    return existingCart;
  }

  // === Insert new cart item ===
  const result = await prisma.cart.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cart creation failed!');
  }

  return result;
};

const getAllFromDB = async (userId: string) => {
  const result = await prisma.cart.findMany({
    where: { userId },
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
          authorId: true,
          author: { select: { id: true, name: true } },
        },
      },
      bundleCourse: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
          price: true,
          avgRating: true,
          ratingCount: true,
          createdAt: true,
          authorId: true,
          author: { select: { id: true, name: true } },
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
          authorId: true,
          author: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Group by author with separate arrays
  const grouped: Record<string, any> = {};

  result.forEach(item => {
    if (item.course) {
      const { authorId, author } = item.course;
      if (!grouped[authorId]) {
        grouped[authorId] = {
          authorId,
          authorName: author?.name ?? 'Unknown',
          courseItem: [],
          courseBundleItem: [],
          bookItem: [],
        };
      }
      grouped[authorId].courseItem.push(item.course);
    }

    if (item.bundleCourse) {
      const { authorId, author } = item.bundleCourse;
      if (!grouped[authorId]) {
        grouped[authorId] = {
          authorId,
          authorName: author?.name ?? 'Unknown',
          courseItem: [],
          courseBundleItem: [],
          bookItem: [],
        };
      }
      grouped[authorId].courseBundleItem.push(item.bundleCourse);
    }

    if (item.book) {
      const { authorId, author } = item.book;
      if (!grouped[authorId]) {
        grouped[authorId] = {
          authorId,
          authorName: author?.name ?? 'Unknown',
          courseItem: [],
          courseBundleItem: [],
          bookItem: [],
        };
      }
      grouped[authorId].bookItem.push(item.book);
    }
  });

  return Object.values(grouped);
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
      bundleCourse: true,
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
