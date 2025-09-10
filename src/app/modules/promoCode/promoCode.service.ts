import { Prisma, PromoCode, UserStatus } from '@prisma/client';
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

  // 5️⃣ Validate model-specific reference
  switch (modelType) {
    case 'books':
      if (!bookId)
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Book ID is required for BOOK PromoCode!',
        );
      const book = await prisma.book.findFirst({
        where: { id: bookId, authorId, isDeleted: false },
      });
      if (!book)
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Book not found or does not belong to author!',
        );
      break;

    case 'courses':
      if (!courseId)
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Course ID is required for COURSE PromoCode!',
        );
      const course = await prisma.course.findFirst({
        where: { id: courseId, authorId, isDeleted: false },
      });
      if (!course)
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Course not found or does not belong to author!',
        );
      break;

    case 'events':
      if (!eventId)
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Event ID is required for EVENT PromoCode!',
        );
      const event = await prisma.event.findFirst({
        where: { id: eventId, authorId, isDeleted: false },
      });
      if (!event)
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Event not found or does not belong to author!',
        );
      break;

    default:
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Invalid PromoCode model type!',
      );
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
          email: true,
          photoUrl: true,
        },
      },
      course: {
        select: {
          title: true,
        },
      },
      book: {
        select: {
          title: true,
        },
      },
      event: {
        select: {
          title: true,
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
  const promoCode = await prisma.promoCode.findUnique({
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

const deleteFromDB = async (id: string): Promise<PromoCode> => {
  const promoCode = await prisma.promoCode.findUniqueOrThrow({
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
  deleteFromDB,
};
