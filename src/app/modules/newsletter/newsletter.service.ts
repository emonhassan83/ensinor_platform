import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import prisma from '../../utils/prisma';
import { IPaginationOptions } from '../../interfaces/pagination';
import { NewsletterStatus, Prisma, RecurrenceType } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { newsletterSearchableFields } from './newsletter.constant';
import { INewsletter, INewsletterFilterRequest } from './newsletter.interface';

const insertIntoDB = async (payload: INewsletter) => {
  const result = await prisma.newsletter.create({
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Newsletter creation failed!');
  }

  return result;
};

const getAllFromDB = async (
  filters: INewsletterFilterRequest,
  options: IPaginationOptions,
) => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.NewsletterWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: newsletterSearchableFields.map(field => ({
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

  const whereConditions: Prisma.NewsletterWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.newsletter.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: 'desc',
          },
  });
  const total = await prisma.newsletter.count({
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
  const result = await prisma.newsletter.findUnique({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Newsletter not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<INewsletter>,
) => {
  const newsletter = await prisma.newsletter.findUnique({
    where: { id },
  });
  if (!newsletter) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Newsletter not found!');
  }

  const result = await prisma.newsletter.update({
    where: { id },
    data: payload,
  });

  return result;
};

const changeStatusIntoDB = async (
  id: string,
  status: NewsletterStatus
) => {
  const newsletter = await prisma.newsletter.findUnique({
    where: { id },
  });
  if (!newsletter) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Newsletter not found!');
  }

  const result = await prisma.newsletter.update({
    where: { id },
    data: {
      status
    },
  });

  return result;
};


const deleteFromDB = async (id: string) => {
  const newsletter = await prisma.newsletter.findUnique({
    where: { id },
  });
  if (!newsletter) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Newsletter not found!');
  }
  
  const result = await prisma.newsletter.delete({
    where: { id },
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Newsletter deletion failed!');
  }

  return result;
};

export const NewsletterServices = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  changeStatusIntoDB,
  deleteFromDB,
};
