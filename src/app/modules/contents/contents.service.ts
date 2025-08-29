import httpStatus from 'http-status';
import { findAdmin } from '../../utils/findAdmin';
import ApiError from '../../errors/ApiError';
import prisma from '../../utils/prisma';
import { IUserFilterRequest } from '../user/user.interface';
import { IPaginationOptions } from '../../interfaces/pagination';
import { Content, Prisma } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { contentSearchableFields } from './contents.constants';
import { IContent } from './contents.interface';

// Create a new content
const createContents = async (payload: IContent) => {
  const admin = await findAdmin();
  if (admin) payload.createdById = admin.id;

  const result = await prisma.content.create({
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Content creation failed');
  }

  return result;
};

// Get all contents
const getAllContents = async (
  filters: IUserFilterRequest,
  options: IPaginationOptions,
) => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.ContentWhereInput[] = [{ isDeleted: false }];

  if (searchTerm) {
    andConditions.push({
      OR: contentSearchableFields.map(field => ({
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

  const whereConditions: Prisma.ContentWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.content.findMany({
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
  const total = await prisma.content.count({
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

// Get content by ID
const getContentsById = async (id: string) => {
 const result = await prisma.content.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
          status: true,
        },
      },
    },
  })

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Content not found')
  }

  return result
};

// Update content
const updateContents = async (id: string,payload: Partial<IContent>) => {
  const existingContent = await prisma.content.findUnique({
    where: { id },
  })

  if (!existingContent) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Content not found!')
  }

  if (existingContent.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'This content already deleted!')
  }

  const updatedContent = await prisma.content.update({
    where: { id },
    data: payload,
  })

  // await contentNotifyToAdmin('UPDATED', updatedContent)

  return updatedContent
};

// Delete content
const deleteContents = async (id: string) => {
  const result = await prisma.content.update({
    where: { id },
    data: { isDeleted: true },
  })

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Content deletion failed')
  }

  return result
};

export const contentsService = {
  createContents,
  getAllContents,
  getContentsById,
  updateContents,
  deleteContents,
};
