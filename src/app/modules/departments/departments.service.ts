import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import prisma from '../../utils/prisma';
import { IPaginationOptions } from '../../interfaces/pagination';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { uploadToS3 } from '../../utils/s3';
import { departmentSearchableFields } from './departments.constant';
import { IDepartment, IDepartmentFilterRequest } from './departments.interface';

const insertIntoDB = async (payload: IDepartment, file: any) => {
  const { authorId } = payload;
  const author = await prisma.user.findUnique({
    where: {
      id: authorId,
      role: UserRole.company_admin,
      status: UserStatus.active,
      isDeleted: false,
    },
  });
  if (!author || author?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Author not found!');
  }

  // upload to image
  if (file) {
    payload.image = (await uploadToS3({
      file,
      fileName: `images/departments/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await prisma.department.create({
    data: payload,
    select: {
      id: true,
      name: true,
      image: true,
      createdAt: true,
      updatedAt: true,
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
    throw new ApiError(httpStatus.BAD_REQUEST, 'Department creation failed!');
  }

  return result;
};

const getAllFromDB = async (
  filters: IDepartmentFilterRequest,
  options: IPaginationOptions,
  userId?: string,
) => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.DepartmentWhereInput[] = [{ isDeleted: false }];
  if (userId) {
    andConditions.push({ authorId: userId });
  }

  if (searchTerm) {
    andConditions.push({
      OR: departmentSearchableFields.map(field => ({
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
    select: {
      id: true,
      name: true,
      image: true,
      createdAt: true,
      updatedAt: true,
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
          bio: true,
          dateOfBirth: true,
          contactNo: true,
          city: true,
          country: true,
          role: true,
          status: true,
          lastActive: true,
          isDeleted: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!result || result.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Department not found');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IDepartment>,
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
     select: {
      id: true,
      name: true,
      image: true,
      createdAt: true,
      updatedAt: true,
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

  return result;
};

const deleteFromDB = async (id: string) => {
  const department = await prisma.department.findUnique({
    where: { id },
  });
  if (!department || department.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Department not found!');
  }

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
