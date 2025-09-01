import {
  Certificate,
  CertificateRequest,
  EnrolledCourse,
  Prisma,
  Quiz,
  QuizAttempt,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  ICertificate,
  ICertificateFilterRequest,
} from './certificate.interface';
import { certificateSearchAbleFields } from './certificate.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { uploadToS3 } from '../../utils/s3';

const insertIntoDB = async (payload: ICertificate, file: any) => {
  const { authorId, courseId } = payload;

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
    },
  });
  if (!course || course?.isDeleted) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Courses not found!');
  }

  const user = await prisma.user.findFirst({
    where: {
      id: authorId,
    },
  });
  if (!user || user?.isDeleted) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Certificate user not found!');
  }

  // upload to image
  if (file) {
    payload.logo = (await uploadToS3({
      file,
      fileName: `images/certificate/logo/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await prisma.certificateRequest.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Certificate creation failed!');
  }
  return result;
};

const getAllFromDB = async (
  params: ICertificateFilterRequest,
  options: IPaginationOptions,
  authorId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.CertificateWhereInput[] = [{ authorId }];

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: certificateSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.CertificateWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.certificate.findMany({
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
      author: true,
      course: true,
    },
  });

  const total = await prisma.certificate.count({
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

const getByIdFromDB = async (id: string): Promise<Certificate | null> => {
  const result = await prisma.certificate.findUnique({
    where: { id },
    include: {
      author: true,
      course: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Certificate not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<ICertificate>,
  file: any,
): Promise<Certificate> => {
  const certificate = await prisma.certificate.findUnique({
    where: { id },
  });
  if (!certificate) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Certificate not found!');
  }

  // upload to image
  if (file) {
    payload.logo = (await uploadToS3({
      file,
      fileName: `images/certificate/logo/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await prisma.certificate.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Certificate not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<Certificate> => {
  const certificate = await prisma.certificate.findUniqueOrThrow({
    where: { id },
  });
  if (!certificate) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Certificate not found!');
  }

  const result = await prisma.certificate.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Certificate not deleted!');
  }

  return result;
};

export const CertificateService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
