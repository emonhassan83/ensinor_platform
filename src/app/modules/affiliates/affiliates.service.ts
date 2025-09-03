import { AffiliateLink, Prisma } from '@prisma/client';
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

const createAffiliateAccount = async (payload: IAffiliateAccount) => {
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

const insertIntoDB = async (payload: IAffiliates) => {
  const result = await prisma.affiliateLink.create({
    data: payload,
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
  reference?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.AffiliateLinkWhereInput[] = [];

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
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
