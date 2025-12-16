import {
  Affiliate,
  AffiliateLink,
  AffiliateModel,
  BookStatus,
  CompanyType,
  CoursesStatus,
  Prisma,
  SubscriptionStatus,
  SubscriptionType,
  UserRole,
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

export const checkAffiliateRestriction = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, status: UserStatus.active, isDeleted: false },
    include: {
      instructor: true,
      subscription: true,
      companyAdmin: { select: { company: { select: { industryType: true } } } },
      businessInstructor: { select: { company: { select: { industryType: true } } } },
    },
  });

  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');

  // Block if NGO, SME, or company admin/business instructor
  const companyType =
    user.role === UserRole.company_admin ? user.companyAdmin?.company?.industryType
      : user.role === UserRole.business_instructors ? user.businessInstructor?.company?.industryType
      : null;

  if ([CompanyType.ngo, CompanyType.sme].includes(companyType as "ngo" | "sme")) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Affiliate accounts and links cannot be created by NGO, SME, or company-admin/business instructor!',
    );
  }

  /* =====================================================
     🔐 INSTRUCTOR SUBSCRIPTION CHECK (NEW)
  ===================================================== */

  const isInstructor =
    user.role === UserRole.instructor || Boolean(user.instructor);

  if (isInstructor) {
    const activeSubscription = user.subscription.find(
      sub =>
        sub.status === SubscriptionStatus.active &&
        !sub.isDeleted &&
        !sub.isExpired &&
        new Date(sub.expiredAt) > new Date(),
    );

    if (!activeSubscription) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'You must have an active premium subscription to use affiliate features.',
      );
    }

    if (activeSubscription.type === SubscriptionType.standard) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Affiliate features are not available for standard subscriptions.',
      );
    }
  }

  return user;
};

const createAffiliateAccount = async (payload: IAffiliateAccount) => {
  const { userId } = payload;

  // 1️⃣ Check restriction
  const user = await checkAffiliateRestriction(userId);

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
  if (!affiliate) throw new ApiError(httpStatus.NOT_FOUND, 'Affiliate account not found!');

  // 1a️⃣ Restrict NGO/SME/company users
  await checkAffiliateRestriction(affiliate.userId);

  // 2️⃣ Validate model-specific reference + duplicate link
  switch (modelType) {
    case AffiliateModel.book:
      if (!bookId) throw new ApiError(httpStatus.BAD_REQUEST, 'Book ID is required for BOOK affiliate!');
      const book = await prisma.book.findFirst({ where: { id: bookId, status: BookStatus.published, isDeleted: false } });
      if (!book) throw new ApiError(httpStatus.BAD_REQUEST, 'Book not found!');
      if (await prisma.affiliateLink.findFirst({ where: { affiliateId, modelType: AffiliateModel.book, bookId } })) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'An affiliate link already exists for this book!');
      }
      break;

    case AffiliateModel.course:
      if (!courseId) throw new ApiError(httpStatus.BAD_REQUEST, 'Course ID is required for COURSE affiliate!');
      const course = await prisma.course.findFirst({ where: { id: courseId, status: CoursesStatus.approved, isDeleted: false } });
      if (!course) throw new ApiError(httpStatus.BAD_REQUEST, 'Course not found!');
      if (await prisma.affiliateLink.findFirst({ where: { affiliateId, modelType: AffiliateModel.course, courseId } })) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'An affiliate link already exists for this course!');
      }
      break;

    case AffiliateModel.event:
      if (!eventId) throw new ApiError(httpStatus.BAD_REQUEST, 'Event ID is required for EVENT affiliate!');
      const event = await prisma.event.findFirst({ where: { id: eventId, isDeleted: false } });
      if (!event) throw new ApiError(httpStatus.BAD_REQUEST, 'Event not found!');
      if (await prisma.affiliateLink.findFirst({ where: { affiliateId, modelType: AffiliateModel.event, eventId } })) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'An affiliate link already exists for this event!');
      }
      break;

    default:
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid affiliate model type!');
  }

  // 3️⃣ Generate affiliate link
  let affiliateLink = '';
  if (courseId) affiliateLink = `${config.client_url}/courses/details/${courseId}?type=course&aff=${affiliateId}`;
  else if (bookId) affiliateLink = `${config.client_url}/shop/details/${bookId}?aff=${affiliateId}`;
  else if (eventId) affiliateLink = `${config.client_url}/events/details/${eventId}?aff=${affiliateId}`;

  // 4️⃣ Create affiliate link
  const result = await prisma.affiliateLink.create({
    data: { ...payload, link: affiliateLink },
  });

  if (!result) throw new ApiError(httpStatus.BAD_REQUEST, 'Affiliate link creation failed!');

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

const clickContentIntoDB = async (
  id: string
): Promise<AffiliateLink> => {
  const affiliateLink = await prisma.affiliateLink.findUnique({
    where: { id },
  });
  if (!affiliateLink) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Affiliate link not found!');
  }

  const result = await prisma.affiliateLink.update({
    where: { id },
    data: {
      clicks: {
        increment: 1,
      },
    },
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
  clickContentIntoDB,
  deleteFromDB,
};
