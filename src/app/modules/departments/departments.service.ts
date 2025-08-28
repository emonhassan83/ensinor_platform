import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import prisma from '../../utils/prisma';
import { IUserFilterRequest } from '../user/user.interface';
import { IPaginationOptions } from '../../interfaces/pagination';
import { Department, Prisma } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { uploadToS3 } from '../../utils/s3';
import { departmentsSearchableFields } from './departments.constant';

const insertIntoDB = async (payload: any, file: any) => {
  // upload to image
  if (file) {
    payload.image = (await uploadToS3({
      file,
      fileName: `images/departments/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await prisma.department.create({
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Department creation failed!');
  }

  return result;
};

const getAllFromDB = async (
  filters: IUserFilterRequest,
  options: IPaginationOptions,
) => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.DepartmentWhereInput[] = [{ isDeleted: false }];

  if (searchTerm) {
    andConditions.push({
      OR: departmentsSearchableFields.map(field => ({
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

  const whereConditions: Prisma.DepartmentWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.department.findMany({
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
  const total = await prisma.department.count({
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
  const result = await prisma.department.findUnique({
    where: { id },
    include: {
      author: {
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
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Department not found');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<Department>,
  file: any,
) => {
  const department = await prisma.department.findUnique({
    where: { id },
  });

  if (!department || department.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Department not found!');
  }

  // upload to image
  if (file) {
    payload.image = (await uploadToS3({
      file,
      fileName: `images/departments/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await prisma.department.update({
    where: { id },
    data: payload,
  });

  return result;
};

const deleteFromDB = async (id: string) => {
  const result = await prisma.department.update({
    where: { id },
    data: { isDeleted: true },
  });

  if (!result || result?.isDeleted) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Department deletion failed');
  }

  return result;
};

export const DepartmentServices = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
