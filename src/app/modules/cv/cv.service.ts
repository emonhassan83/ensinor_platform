import { CV, Prisma, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { ICV, ICVFilterRequest } from './cv.interface';
import { cvSearchAbleFields } from './cv.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { uploadToS3 } from '../../utils/s3';
import httpStatus from 'http-status';

const insertIntoDB = async (payload: ICV, file: any) => {
  const { userId } = payload;

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      status: UserStatus.active,
      isDeleted: false,
    },
  });
  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'CV author not found!');
  }

  // Check if CV already exists for this user
  const existingCV = await prisma.cV.findUnique({
    where: { userId },
  });
  if (existingCV) {
    return existingCV;
  }

  // upload to image
  if (file) {
    payload.photo = (await uploadToS3({
      file,
      fileName: `images/cv/photos/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await prisma.cV.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'CV creation failed!');
  }
  return result;
};

const getAllFromDB = async (
  params: ICVFilterRequest,
  options: IPaginationOptions,
  userId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.CVWhereInput[] = [{ userId }];

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: cvSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.CVWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.cV.findMany({
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
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
        },
      },
      educations: true,
      experiences: true,
      certificates: true,
    },
  });

  const total = await prisma.cV.count({
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

const getByIdFromDB = async (id: string): Promise<CV | null> => {
  const result = await prisma.cV.findUnique({
    where: { id },
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
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! CV not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<ICV>,
  file: any,
): Promise<CV> => {
  const cv = await prisma.cV.findUnique({
    where: { id },
  });
  if (!cv) {
    throw new ApiError(httpStatus.NOT_FOUND, 'CV not found!');
  }

  // upload to image
  if (file) {
    payload.photo = (await uploadToS3({
      file,
      fileName: `images/cv/photos/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await prisma.cV.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'CV not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<CV> => {
  const cv = await prisma.cV.findUniqueOrThrow({
    where: { id },
  });
  if (!cv) {
    throw new ApiError(httpStatus.NOT_FOUND, 'CV not found!');
  }

  const result = await prisma.cV.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'CV not deleted!');
  }

  return result;
};

export const CVService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
