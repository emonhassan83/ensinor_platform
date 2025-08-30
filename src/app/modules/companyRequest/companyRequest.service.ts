import {
  CompanyRequest,
  Prisma
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { ICompanyRequest, ICompanyRequestFilterRequest } from './companyRequest.interface';
import { companyRequestSearchAbleFields } from './companyRequest.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';

const insertIntoDB = async (payload: ICompanyRequest) => {
  const user = await prisma.user.findUnique({
    where: {
      id: payload.userId,
    },
  });

  if (!user || user?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');
  }

  const result = await prisma.companyRequest.create({
    data: payload,
    include: { user: true },
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Company request creation failed!',
    );
  }
  return result;
};

const getAllFromDB = async (
  params: ICompanyRequestFilterRequest,
  options: IPaginationOptions,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.CompanyRequestWhereInput[] = [];

  // Search across CompanyRequest and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: companyRequestSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.CompanyRequestWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.companyRequest.findMany({
    where: whereConditions,
    include: { user: true },
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
  });

  const total = await prisma.companyRequest.count({
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

const getByIdFromDB = async (id: string): Promise<CompanyRequest | null> => {
  const result = await prisma.companyRequest.findUnique({
    where: { id },
    include: { user: true },
  });

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<ICompanyRequest>,
): Promise<CompanyRequest> => {
  const result = await prisma.companyRequest.update({
    where: { id },
    data: payload,
    include: { user: true },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Company request not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<CompanyRequest> => {
  const companyReq = await prisma.companyRequest.findUniqueOrThrow({
    where: { id },
  });
  if (!companyReq) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Company request not found!');
  }

  const result = await prisma.companyRequest.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Company request not found!');
  }

  return result;
};

export const CompanyRequestService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
