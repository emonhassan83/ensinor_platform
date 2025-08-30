import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import prisma from '../../utils/prisma';
import { IPaginationOptions } from '../../interfaces/pagination';
import { Prisma } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { supportSearchableFields } from './support.constant';
import { ISupport, ISupportFilterRequest } from './support.interface';

const insertIntoDB = async (payload: ISupport) => {
  const result = await prisma.support.create({
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Support creation failed!');
  }

  return result;
};

const getAllFromDB = async (
  filters: ISupportFilterRequest,
  options: IPaginationOptions,
) => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.SupportWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: supportSearchableFields.map(field => ({
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

  const whereConditions: Prisma.SupportWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.support.findMany({
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
  const total = await prisma.support.count({
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
  const result = await prisma.support.findUnique({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Support not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<ISupport>,
) => {
  const support = await prisma.support.findUnique({
    where: { id },
  });
  if (!support) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Support not found!');
  }

  const result = await prisma.support.update({
    where: { id },
    data: payload,
  });

  return result;
};

const changeStatusIntoDB = async (
  id: string
) => {
  const support = await prisma.support.findUnique({
    where: { id },
  });
  if (!support) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Support not found!');
  }

  const result = await prisma.support.update({
    where: { id },
    data: {
      isResponse: true
    },
  });

  return result;
};


const deleteFromDB = async (id: string) => {
  const support = await prisma.support.findUnique({
    where: { id },
  });
  if (!support) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Support not found!');
  }
  
  const result = await prisma.support.delete({
    where: { id },
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Support deletion failed!');
  }

  return result;
};

export const SupportServices = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  changeStatusIntoDB,
  deleteFromDB,
};
