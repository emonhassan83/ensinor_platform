import {
  Affiliate,
  AffiliateLink,
  AffiliateModel,
  BookStatus,
  CoursesStatus,
  Prisma,
  UserStatus,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  IAffiliateAccount,
  IAffiliates,
  IAffiliatesFilterRequest,
} from './affiliates.interface';
import { affiliateSearchAbleFields } from './affiliates.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';
import config from '../../config';

const createAffiliateAccount = async (payload: IAffiliateAccount) => {
  const { userId } = payload;

  // Check if user exists
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

  // Check if affiliate account already exists
  const existingAffiliate = await prisma.affiliate.findUnique({
    where: { userId },
  });
  if (existingAffiliate) {
    return existingAffiliate;
  }

  // Create new affiliate account
  const result = await prisma.affiliate.create({
    data: payload,
  });
  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Affiliate account creation failed!',
    );
  }
  return result;
};

const getAffiliateAccount = async (
  userId: string,
): Promise<Affiliate | null> => {
  const result = await prisma.affiliate.findFirst({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
        },
      },
    },
  });

  if (!result) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Oops! Affiliate account not found!',
    );
  }
  return result;
};

const insertIntoDB = async (payload: IAffiliates) => {
  const { affiliateId, modelType, bookId, courseId, eventId } = payload;

  // 1️⃣ Validate affiliate account exists
  const affiliate = await prisma.affiliate.findFirst({
    where: { id: affiliateId },
    include: { user: true },
  });
  if (!affiliate) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Affiliate account not found!');
  }

  // 2️⃣ Validate model-specific reference + check duplicate affiliate link
  switch (modelType) {
    case AffiliateModel.books: {
      if (!bookId) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Book ID is required for BOOK affiliate!',
        );
      }

      const book = await prisma.book.findFirst({
        where: { id: bookId, status: BookStatus.published, isDeleted: false },
      });
      if (!book) throw new ApiError(httpStatus.BAD_REQUEST, 'Book not found!');

      // ✅ Check if affiliate link already exists for this book
      const existingBookAffiliate = await prisma.affiliateLink.findFirst({
        where: { affiliateId, modelType: AffiliateModel.books, bookId },
      });
      if (existingBookAffiliate) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'An affiliate link already exists for this book!',
        );
      }
      break;
    }

    case AffiliateModel.courses: {
      if (!courseId) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Course ID is required for COURSE affiliate!',
        );
      }

      const course = await prisma.course.findFirst({
        where: {
          id: courseId,
          status: CoursesStatus.approved,
          isDeleted: false,
        },
      });
      if (!course) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Course not found!');
      }

      // ✅ Check if affiliate link already exists for this course
      const existingCourseAffiliate = await prisma.affiliateLink.findFirst({
        where: { affiliateId, modelType: AffiliateModel.courses, courseId },
      });
      if (existingCourseAffiliate) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'An affiliate link already exists for this course!',
        );
      }
      break;
    }

    case AffiliateModel.events: {
      if (!eventId) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Event ID is required for EVENT affiliate!',
        );
      }

      const event = await prisma.event.findFirst({
        where: { id: eventId, isDeleted: false },
      });
      if (!event) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Event not found!');
      }

      // ✅ Check if affiliate link already exists for this event
      const existingEventAffiliate = await prisma.affiliateLink.findFirst({
        where: { affiliateId, modelType: AffiliateModel.events, eventId },
      });
      if (existingEventAffiliate) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'An affiliate link already exists for this event!',
        );
      }
      break;
    }

    default:
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Invalid affiliate model type!',
      );
  }

  // 3️⃣ Check duplicate affiliate link globally (safety net)
  const existingLink = await prisma.affiliateLink.findFirst({
    where: {
      affiliateId,
      courseId,
      bookId,
      eventId,
    },
  });
  if (existingLink) {
    return existingLink;
  }

  // 4️⃣ Generate affiliate link dynamically
  let affiliateLink = '';
  if (courseId) {
    affiliateLink = `${config.client_url}/course/${courseId}?aff=${affiliateId}`;
  } else if (bookId) {
    affiliateLink = `${config.client_url}/book/${bookId}?aff=${affiliateId}`;
  } else if (eventId) {
    affiliateLink = `${config.client_url}/event/${eventId}?aff=${affiliateId}`;
  }

  // 5️⃣ Create new affiliate link
  const result = await prisma.affiliateLink.create({
    data: {
      ...payload,
      link: affiliateLink,
    },
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Affiliate link creation failed!',
    );
  }

  return result;
};

const getAllFromDB = async (
  params: IAffiliatesFilterRequest,
  options: IPaginationOptions,
  authorId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  let affiliate: Affiliate | null = null;
  if (authorId) {
    // Validate affiliate account for the author
    affiliate = await prisma.affiliate.findFirst({
      where: { userId: authorId },
    });
    if (!affiliate) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Affiliate account not found for the author!',
      );
    }
  }

  const andConditions: Prisma.AffiliateLinkWhereInput[] = [];
  if (affiliate) {
    andConditions.push({ affiliateId: affiliate.id });
  }

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: affiliateSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.AffiliateLinkWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.affiliateLink.findMany({
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
        },
      },
      book: {
        select: {
          id: true,
          title: true,
        },
      },
      event: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  const total = await prisma.affiliateLink.count({
    where: whereConditions,
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: { affiliate, affiliateLinks: result },
  };
};

const getByIdFromDB = async (id: string): Promise<AffiliateLink | null> => {
  const result = await prisma.affiliateLink.findUnique({
    where: { id },
    include: {
      affiliate: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
            },
          },
        },
      },
      course: true,
      book: true,
      event: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Affiliate link not found!');
  }
  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IAffiliates>,
): Promise<AffiliateLink> => {
  const affiliateLink = await prisma.affiliateLink.findUnique({
    where: { id },
  });
  if (!affiliateLink) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Affiliate link not found!');
  }

  const result = await prisma.affiliateLink.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Affiliate link not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<AffiliateLink> => {
  const affiliateLink = await prisma.affiliateLink.findUniqueOrThrow({
    where: { id },
  });
  if (!affiliateLink) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Affiliate link not found!');
  }

  const result = await prisma.affiliateLink.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Affiliate link not deleted!');
  }

  return result;
};

export const AffiliateService = {
  createAffiliateAccount,
  getAffiliateAccount,
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
