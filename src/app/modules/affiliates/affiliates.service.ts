import {
  Affiliate,
  AffiliateLink,
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
  const { affiliateId, courseId } = payload;

  // 1️⃣ Validate affiliate exists
  const affiliate = await prisma.affiliate.findFirst({
    where: { id: affiliateId },
  });
  if (!affiliate) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Affiliate account not found!');
  }

  // 2️⃣ Validate course exists
  const course = await prisma.course.findFirst({
    where: { id: courseId, status: CoursesStatus.approved, isDeleted: false },
  });
  if (!course) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Course not found or not available!',
    );
  }

  // 3️⃣ Prevent duplicate affiliate link for the same affiliate & course
  const existingLink = await prisma.affiliateLink.findFirst({
    where: {
      affiliateId,
      courseId,
    },
  });

  if (existingLink) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Affiliate link already exists for this course!',
    );
  }

  // 4️⃣ Generate affiliate link
  const affiliateLink = `${config.client_url}/course/${courseId}?aff=${affiliateId}`;

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
  affiliateId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.AffiliateLinkWhereInput[] = [];
  if (affiliateId) {
    andConditions.push({ affiliateId });
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
    data: result,
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
              email: true,
              photoUrl: true,
            },
          },
        },
      },
      course: true,
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
