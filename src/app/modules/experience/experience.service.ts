import { Experience, Prisma } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IExperience, IExperienceFilterRequest } from './experience.interface';
import { experienceSearchAbleFields } from './experience.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';

const insertIntoDB = async (payload: IExperience) => {
  const { cvId } = payload;

  const cv = await prisma.cV.findFirst({
    where: {
      id: cvId,
    },
  });
  if (!cv) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'CV not found!');
  }

  const result = await prisma.experience.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'CV experience creation failed!');
  }
  return result;
};

const getAllFromDB = async (
  params: IExperienceFilterRequest,
  options: IPaginationOptions,
  cvId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.ExperienceWhereInput[] = [{ cvId }];

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: experienceSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.ExperienceWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.experience.findMany({
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
          }
  });

  const total = await prisma.experience.count({
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

const getByIdFromDB = async (id: string): Promise<Experience | null> => {
  const result = await prisma.experience.findUnique({
    where: { id },
    include: {
      cv: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! CV experience not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IExperience>,
): Promise<Experience> => {
  const experience = await prisma.experience.findUnique({
    where: { id },
  });
  if (!experience) {
    throw new ApiError(httpStatus.NOT_FOUND, 'CV experience not found!');
  }

  const result = await prisma.experience.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'CV experience not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<Experience> => {
  const experience = await prisma.experience.findUniqueOrThrow({
    where: { id },
  });
  if (!experience) {
    throw new ApiError(httpStatus.NOT_FOUND, 'CV experience not found!');
  }

  const result = await prisma.experience.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'CV experience not deleted!');
  }

  return result;
};

export const ExperienceService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
