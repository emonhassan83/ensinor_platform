import { Prisma, Resource } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IResource, IResourceFilterRequest } from './resources.interface';
import { resourceSearchAbleFields } from './resources.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';

const insertIntoDB = async (payload: IResource) => {
  const result = await prisma.resource.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Resource creation failed!');
  }

  return result;
};

const getAllFromDB = async (
  params: IResourceFilterRequest,
  options: IPaginationOptions,
  reference?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.ResourceWhereInput[] = [{ reference }];

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: resourceSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.ResourceWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.resource.findMany({
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
  });

  const total = await prisma.resource.count({
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

const getByIdFromDB = async (id: string): Promise<Resource | null> => {
  const result = await prisma.resource.findUnique({
    where: { id },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Resource not found!');
  }
  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IResource>,
): Promise<Resource> => {
  const resource = await prisma.resource.findUnique({
    where: { id },
  });
  if (!resource) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Resource not found!');
  }

  const result = await prisma.resource.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Resource not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<Resource> => {
  const resource = await prisma.resource.findUniqueOrThrow({
    where: { id },
  });
  if (!resource) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Resource not found!');
  }

  const result = await prisma.resource.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Resource not deleted!');
  }

  return result;
};

export const ResourceService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
