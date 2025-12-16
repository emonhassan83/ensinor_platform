import {
  CompanyType,
  Coupon,
  CouponModel,
  Prisma,
  PromoCodeModel,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { ICoupon, ICouponFilterRequest } from './coupon.interface';
import { couponSearchAbleFields } from './coupon.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';
import {
  checkActiveSubscriptionForInstructor,
  checkCompanyRestriction,
} from '../../utils/checkActiveSubscription';

const insertIntoDB = async (payload: ICoupon) => {
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

  // 1️⃣ Check author exists and include company info if applicable
  const author = await prisma.user.findUnique({
    where: { id: authorId, status: UserStatus.active, isDeleted: false },
    include: {
      companyAdmin: {
        select: {
          company: { select: { id: true, industryType: true, isActive: true } },
        },
      },
      businessInstructor: {
        select: {
          company: { select: { id: true, industryType: true, isActive: true } },
        },
      },
    },
  });
  if (!author) throw new ApiError(httpStatus.NOT_FOUND, 'Author not found!');

  // 1a️⃣ Check company restriction
  await checkCompanyRestriction(author, 'coupons');

  // subscription check ONLY for instructors
  await checkActiveSubscriptionForInstructor(author, 'coupon');

  // set global coupon if author super admin
  payload.isGlobal = author.role === UserRole.super_admin;
  if (payload.isGlobal) {
    if (bookId || courseId || eventId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Global coupon cannot be linked to a specific book, course, or event!',
      );
    }

    payload.modelType = CouponModel.global;
  }

  // 2️⃣ Validate discount
  if (discount <= 0)
    throw new ApiError(httpStatus.BAD_REQUEST, 'Discount must be positive!');

  // 3️⃣ Validate expiration date
  if (new Date(expireAt) <= new Date())
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Coupon expiration must be in the future!',
    );

  // 4️⃣ Validate code uniqueness
  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Coupon code already exists! Please choose a different code.',
    );

  if (!payload.isGlobal) {
    // 5️⃣ Validate model-specific reference + active coupon check
    let referenceWhere: any = { authorId, isActive: true };

    switch (modelType) {
      case CouponModel.book:
        if (!bookId)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'Book ID is required for BOOK coupon!',
          );
        const book = await prisma.book.findFirst({
          where: { id: bookId, authorId, isDeleted: false },
        });
        if (!book)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'Book not found or does not belong to author!',
          );

        // ⚠️ Prevent coupon if promo exists
        const existingBookPromo = await prisma.promoCode.findFirst({
          where: { modelType: PromoCodeModel.book, bookId, isActive: true },
        });
        if (existingBookPromo)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'A promo code already exists for this book! Cannot create coupon.',
          );

        // Check active coupon for this book
        const existingBookCoupon = await prisma.coupon.findFirst({
          where: { ...referenceWhere, modelType: CouponModel.book, bookId },
        });
        if (existingBookCoupon)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'An active coupon already exists for this book!',
          );
        break;

      case CouponModel.course:
        if (!courseId)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'Course ID is required for COURSE coupon!',
          );
        const course = await prisma.course.findFirst({
          where: { id: courseId, isDeleted: false },
        });
        if (!course)
          throw new ApiError(httpStatus.BAD_REQUEST, 'Course not found !');

        const existingCoursePromo = await prisma.promoCode.findFirst({
          where: { modelType: PromoCodeModel.course, courseId, isActive: true },
        });
        if (existingCoursePromo)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'A promo code already exists for this course! Cannot create coupon.',
          );

        // Check active coupon for this course
        const existingCourseCoupon = await prisma.coupon.findFirst({
          where: { ...referenceWhere, modelType: CouponModel.course, courseId },
        });
        if (existingCourseCoupon)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'An active coupon already exists for this course!',
          );
        break;

      case CouponModel.event:
        if (!eventId)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'Event ID is required for EVENT coupon!',
          );
        const event = await prisma.event.findFirst({
          where: { id: eventId, authorId, isDeleted: false },
        });
        if (!event)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'Event not found or does not belong to author!',
          );

        const existingEventPromo = await prisma.promoCode.findFirst({
          where: { modelType: PromoCodeModel.event, eventId, isActive: true },
        });
        if (existingEventPromo)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'A promo code already exists for this event! Cannot create coupon.',
          );

        // Check active coupon for this event
        const existingEventCoupon = await prisma.coupon.findFirst({
          where: { ...referenceWhere, modelType: CouponModel.event, eventId },
        });
        if (existingEventCoupon)
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            'An active coupon already exists for this event!',
          );
        break;

      default:
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Invalid coupon model type!',
        );
    }
  }

  // 6️⃣ Validate maxUsage
  if (maxUsage !== undefined && maxUsage <= 0)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Max usage must be greater than 0!',
    );

  // ✅ Create coupon
  const result = await prisma.coupon.create({ data: payload });
  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon creation failed!');
  }

  return result;
};

const getAllFromDB = async (
  params: ICouponFilterRequest,
  options: IPaginationOptions,
  filterBy?: { authorId?: string; isGlobal?: boolean },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.CouponWhereInput[] = [{ isActive: true }];
  // Filter either by authorId
  if (filterBy && filterBy.authorId) {
    andConditions.push({ authorId: filterBy.authorId });
  }
  if (filterBy && filterBy.isGlobal !== undefined) {
    andConditions.push({ isGlobal: filterBy.isGlobal });
  }

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: couponSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.CouponWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.coupon.findMany({
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

  const total = await prisma.coupon.count({
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

const getByIdFromDB = async (id: string): Promise<Coupon | null> => {
  const result = await prisma.coupon.findUnique({
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
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Coupon not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<ICoupon>,
): Promise<Coupon> => {
  const coupon = await prisma.coupon.findFirst({
    where: { id },
  });
  if (!coupon) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not found!');
  }

  const result = await prisma.coupon.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not updated!');
  }

  return result;
};

const changedActiveStatusIntoDB = async (id: string): Promise<Coupon> => {
  const coupon = await prisma.coupon.findFirst({
    where: { id },
  });
  if (!coupon) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not found!');
  }

  // Toggle the isActive field
  const result = await prisma.coupon.update({
    where: { id },
    data: { isActive: !coupon.isActive },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<Coupon> => {
  const coupon = await prisma.coupon.findFirst({
    where: { id },
  });
  if (!coupon) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not found!');
  }

  const result = await prisma.coupon.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not deleted!');
  }

  return result;
};

export const CouponService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  changedActiveStatusIntoDB,
  deleteFromDB,
};
