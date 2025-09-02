import { CVCertificate, Prisma } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { ICVCertificate, ICVCertificateFilterRequest } from './cvCertificate.interface';
import { cvCertificateSearchAbleFields } from './cvCertificate.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';

const insertIntoDB = async (payload: ICVCertificate) => {
  const { cvId } = payload;

  const cv = await prisma.cV.findFirst({
    where: {
      id: cvId,
    },
  });
  if (!cv) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'CV not found!');
  }

  const result = await prisma.cVCertificate.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'CV certificate creation failed!');
  }
  return result;
};

const getAllFromDB = async (
  params: ICVCertificateFilterRequest,
  options: IPaginationOptions,
  cvId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.CVCertificateWhereInput[] = [{ cvId }];

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: cvCertificateSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.CVCertificateWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.cVCertificate.findMany({
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

  const total = await prisma.cVCertificate.count({
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

const getByIdFromDB = async (id: string): Promise<CVCertificate | null> => {
  const result = await prisma.cVCertificate.findUnique({
    where: { id },
    include: {
      cv: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! CV certificate not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<ICVCertificate>,
): Promise<CVCertificate> => {
  const cVCertificate = await prisma.cVCertificate.findUnique({
    where: { id },
  });
  if (!cVCertificate) {
    throw new ApiError(httpStatus.NOT_FOUND, 'CV certificate not found!');
  }

  const result = await prisma.cVCertificate.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'CV certificate not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<CVCertificate> => {
  const cVCertificate = await prisma.cVCertificate.findUniqueOrThrow({
    where: { id },
  });
  if (!cVCertificate) {
    throw new ApiError(httpStatus.NOT_FOUND, 'CV certificate not found!');
  }

  const result = await prisma.cVCertificate.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'CV certificate not deleted!');
  }

  return result;
};

export const CVCertificateService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
