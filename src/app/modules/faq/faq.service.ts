import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import prisma from '../../utils/prisma';
import { IPaginationOptions } from '../../interfaces/pagination';
import { Prisma } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { faqSearchableFields } from './faq.constant';
import { IFaq, IFaqFilterRequest } from './faq.interface';

const insertIntoDB = async (payload: IFaq) => {
  const result = await prisma.fAQ.create({
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'FAQ creation failed!');
  }

  return result;
};

const getAllFromDB = async (
  filters: IFaqFilterRequest,
  options: IPaginationOptions,
) => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.FAQWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: faqSearchableFields.map(field => ({
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

  const whereConditions: Prisma.FAQWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.fAQ.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: 'asc',
          },
  });
  const total = await prisma.fAQ.count({
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
  const result = await prisma.fAQ.findUnique({
    where: { id },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Faq not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IFaq>,
) => {
  const faq = await prisma.fAQ.findUnique({
    where: { id },
  });
  if (!faq) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Faq not found!');
  }

  const result = await prisma.fAQ.update({
    where: { id },
    data: payload,
  });

  return result;
};


const deleteFromDB = async (id: string) => {
  const faq = await prisma.fAQ.findUnique({
    where: { id },
  });
  if (!faq) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Faq not found!');
  }
  
  const result = await prisma.fAQ.delete({
    where: { id },
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Faq deletion failed');
  }

  return result;
};

export const FaqServices = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
