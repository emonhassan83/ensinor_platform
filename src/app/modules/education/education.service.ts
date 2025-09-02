import { CV, Education, Prisma } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IEducation, IEducationFilterRequest } from './education.interface';
import { educationSearchAbleFields } from './education.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { uploadToS3 } from '../../utils/s3';

const insertIntoDB = async (payload: IEducation) => {
  const { cvId } = payload;

  const cv = await prisma.cV.findFirst({
    where: {
      id: cvId,
    },
  });
  if (!cv) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'CV not found!');
  }

  const result = await prisma.education.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'CV education creation failed!');
  }
  return result;
};

const getAllFromDB = async (
  params: IEducationFilterRequest,
  options: IPaginationOptions,
  cvId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.EducationWhereInput[] = [{ cvId }];

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: educationSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.EducationWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.education.findMany({
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
      cv: true,
    },
  });

  const total = await prisma.education.count({
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

const getByIdFromDB = async (id: string): Promise<Education | null> => {
  const result = await prisma.education.findUnique({
    where: { id },
    include: {
      cv: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! CV education not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IEducation>,
): Promise<Education> => {
  const education = await prisma.education.findUnique({
    where: { id },
  });
  if (!education) {
    throw new ApiError(httpStatus.NOT_FOUND, 'CV education not found!');
  }

  const result = await prisma.education.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'CV education not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<Education> => {
  const education = await prisma.education.findUniqueOrThrow({
    where: { id },
  });
  if (!education) {
    throw new ApiError(httpStatus.NOT_FOUND, 'CV education not found!');
  }

  const result = await prisma.education.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'CV education not deleted!');
  }

  return result;
};

export const EducationService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
