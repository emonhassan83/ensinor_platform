import {
  CouponModel,
  Prisma,
  PromoCode,
  PromoCodeModel,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IPromoCode, IPromoCodeFilterRequest } from './promoCode.interface';
import { promoCodeSearchAbleFields } from './promoCode.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';

const insertIntoDB = async (payload: IPromoCode) => {
  const {
    authorId,
    modelType,
    bookId,
    courseId,
    eventId,
    code,
    discount,
    expireAt,
    maxUsage,
  } = payload;

  // 1️⃣ Check author exists
  const author = await prisma.user.findUnique({
    where: { id: authorId, status: UserStatus.active, isDeleted: false },
  });
  if (!author) throw new ApiError(httpStatus.NOT_FOUND, 'Author not found!');

  // set global promo if author super admin
  payload.isGlobal = author.role === UserRole.super_admin;
  if (payload.isGlobal) {
    if (bookId || courseId || eventId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Global promo cannot be linked to a specific book, course, or event!',
      );
    }

    payload.modelType = PromoCodeModel.global;
  }

  // 2️⃣ Validate discount
  if (discount <= 0)
    throw new ApiError(httpStatus.BAD_REQUEST, 'Discount must be positive!');

  // 3️⃣ Validate expiration date
  if (new Date(expireAt) <= new Date())
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'PromoCode expiration must be in the future!',
    );

  // 4️⃣ Validate code uniqueness
  const existing = await prisma.promoCode.findUnique({ where: { code } });
  if (existing)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'PromoCode code already exists!',
    );

  if (!payload.isGlobal) {
    // 5️⃣ Validate model-specific reference + active coupon check
    let referenceWhere: any = { authorId, isActive: true };

    switch (modelType) {
      case PromoCodeModel.book:
        if (!bookId)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'Book ID is required for BOOK promo!',
          );
        const book = await prisma.book.findFirst({
          where: { id: bookId, authorId, isDeleted: false },
        });
        if (!book)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'Book not found or does not belong to author!',
          );

        // ⚠️ Check if coupon already exists for this book
        const existingBookCoupon = await prisma.coupon.findFirst({
          where: { modelType: CouponModel.book, bookId, isActive: true },
        });
        if (existingBookCoupon)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'A coupon already exists for this book! Cannot create promo.',
          );

        // Check active promo for this book
        const existingBookPromo = await prisma.promoCode.findFirst({
          where: { ...referenceWhere, modelType: PromoCodeModel.book, bookId },
        });
        if (existingBookPromo)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'An active promo already exists for this book!',
          );
        break;

      case PromoCodeModel.course:
        if (!courseId)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'Course ID is required for COURSE promo!',
          );
        const course = await prisma.course.findFirst({
          where: { id: courseId, isDeleted: false },
        });
        if (!course)
          throw new ApiError(httpStatus.BAD_REQUEST, 'Course not found !');

        const existingCourseCoupon = await prisma.coupon.findFirst({
          where: { modelType: CouponModel.course, courseId, isActive: true },
        });
        if (existingCourseCoupon)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'A coupon already exists for this course! Cannot create promo.',
          );

        // Check active promo for this course
        const existingCoursePromo = await prisma.promoCode.findFirst({
          where: {
            ...referenceWhere,
            modelType: PromoCodeModel.course,
            courseId,
          },
        });
        if (existingCoursePromo)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'An active promo already exists for this course!',
          );
        break;

      case PromoCodeModel.event:
        if (!eventId)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'Event ID is required for EVENT promo!',
          );
        const event = await prisma.event.findFirst({
          where: { id: eventId, authorId, isDeleted: false },
        });
        if (!event)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'Event not found or does not belong to author!',
          );

        const existingEventCoupon = await prisma.coupon.findFirst({
          where: { modelType: CouponModel.event, eventId, isActive: true },
        });
        if (existingEventCoupon)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'A coupon already exists for this event! Cannot create promo.',
          );

        // Check active promo for this event
        const existingEventPromo = await prisma.promoCode.findFirst({
          where: {
            ...referenceWhere,
            modelType: PromoCodeModel.event,
            eventId,
          },
        });
        if (existingEventPromo)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'An active promo already exists for this event!',
          );
        break;

      default:
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid promo model type!');
    }
  }

  // 6️⃣ Validate maxUsage
  if (maxUsage !== undefined && maxUsage <= 0)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Max usage must be greater than 0!',
    );

  // ✅ Create PromoCode
  const result = await prisma.promoCode.create({ data: payload });
  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'PromoCode creation failed!');
  }

  return result;
};

const getAllFromDB = async (
  params: IPromoCodeFilterRequest,
  options: IPaginationOptions,
  authorId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.PromoCodeWhereInput[] = [];
  if (authorId) {
    andConditions.push({ authorId });
  }

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: promoCodeSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.PromoCodeWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.promoCode.findMany({
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
      author: {
        select: {
          id: true,
          name: true,
          photoUrl: true,
        },
      },
      course: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
        },
      },
      book: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
        },
      },
      event: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
        },
      },
    },
  });

  const total = await prisma.promoCode.count({
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

const getByIdFromDB = async (id: string): Promise<PromoCode | null> => {
  const result = await prisma.promoCode.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
        },
      },
      course: true,
      book: true,
      event: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Promo code not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IPromoCode>,
): Promise<PromoCode> => {
  const promoCode = await prisma.promoCode.findFirst({
    where: { id },
  });
  if (!promoCode) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promo code not found!');
  }

  const result = await prisma.promoCode.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promo code not updated!');
  }

  return result;
};

const changedActiveStatusIntoDB = async (id: string): Promise<PromoCode> => {
  const promoCode = await prisma.promoCode.findFirst({
    where: { id },
  });
  if (!promoCode) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promo code not found!');
  }

  const result = await prisma.promoCode.update({
    where: { id },
    data: { isActive: !promoCode.isActive },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promo code not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<PromoCode> => {
  const promoCode = await prisma.promoCode.findFirst({
    where: { id },
  });
  if (!promoCode) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promo code not found!');
  }

  const result = await prisma.promoCode.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promo code not deleted!');
  }

  return result;
};

export const PromoCodeService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  changedActiveStatusIntoDB,
  deleteFromDB,
};
