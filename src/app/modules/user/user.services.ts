import {
  BusinessInstructor,
  Employee,
  Prisma,
  SuperAdmin,
  UserRole,
  UserStatus,
} from '@prisma/client';
import prisma from '../../utils/prisma';
import httpStatus from 'http-status';
import { hashedPassword } from './user.utils';
import { IUser, IUserFilterRequest } from './user.interface';
import { userSearchableFields } from './user.constant';
import { Request } from 'express';
import ApiError from '../../errors/ApiError';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IGenericResponse } from '../../interfaces/common';
import { paginationHelpers } from '../../helpers/paginationHelper';

const createAdmin = async (req: Request): Promise<SuperAdmin> => {
  const hashPassword = await hashedPassword(req.body.password);

  const result = await prisma.$transaction(async transactionClient => {
    await transactionClient.user.create({
      data: {
        email: req.body.admin.email,
        password: hashPassword,
        role: UserRole.super_admin,
      },
    });

    const newAdmin = await transactionClient.superAdmin.create({
      data: req.body.admin,
    });

    return newAdmin;
  });

  return result;
};

const createDoctor = async (req: Request) => {
  const hashPassword = await hashedPassword(req.body.password);

  const result = await prisma.$transaction(async transactionClient => {
    await transactionClient.user.create({
      data: {
        email: req.body.doctor.email,
        password: hashPassword,
        role: UserRole.company_admin,
      },
    });

    const newDoctor = await transactionClient.companyAdmin.create({
      data: req.body.doctor,
    });

    return newDoctor;
  });

  return result;
};

const createReceptionist = async (req: Request): Promise<BusinessInstructor> => {
  const hashPassword = await hashedPassword(req.body.password);

  const result = await prisma.$transaction(async transactionClient => {
    await transactionClient.user.create({
      data: {
        email: req.body.receptionist.email,
        password: hashPassword,
        role: UserRole.business_instructors,
      },
    });

    const newReceptionist = await transactionClient.businessInstructor.create({
      data: req.body.receptionist,
    });

    return newReceptionist;
  });

  return result;
};

const createPatient = async (req: Request): Promise<Employee> => {
  const hashPassword = await hashedPassword(req.body.password);

  const result = await prisma.$transaction(async transactionClient => {
    await transactionClient.user.create({
      data: {
        email: req.body.patient.email,
        password: hashPassword,
        role: UserRole.employee,
      },
    });

    const newPatient = await transactionClient.employee.create({
      data: req.body.patient,
    });

    return newPatient;
  });

  return result;
};

const changeProfileStatus = async (userId: string, status: UserStatus) => {
  const isUserExist = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (!isUserExist) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User does not exists!');
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: status,
  });

  return updatedUser;
};

const getAllUser = async (
  filters: IUserFilterRequest,
  options: IPaginationOptions,
): Promise<IGenericResponse<IUser[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      OR: userSearchableFields.map(field => ({
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

  const whereConditions: Prisma.UserWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.user.findMany({
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
      email: true,
      role: true,
      needPasswordChange: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const total = await prisma.user.count({
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

const getMyProfile = async (authUser: any) => {
  const userData = await prisma.user.findUnique({
    where: {
      id: authUser.userId,
      status: UserStatus.active,
    },
    select: {
      email: true,
      role: true,
      needPasswordChange: true,
      status: true,
    },
  });

  let profileData;
  if (userData?.role === UserRole.super_admin) {
    profileData = await prisma.superAdmin.findUnique({
      where: {
        email: userData.email,
      },
    });
  } else if (userData?.role === UserRole.company_admin) {
    profileData = await prisma.companyAdmin.findUnique({
      where: {
        email: userData.email,
      },
    });
  } else if (userData?.role === UserRole.business_instructors) {
    profileData = await prisma.businessInstructor.findUnique({
      where: {
        email: userData.email,
      },
    });
  } else if (userData?.role === UserRole.employee) {
    profileData = await prisma.employee.findUnique({
      where: {
        email: userData.email,
      },
    });
  }
  return { ...profileData, ...userData };
};

const updateMyProfile = async (authUser: any, req: Request) => {
  const userData = await prisma.user.findUnique({
    where: {
      id: authUser.userId,
      status: UserStatus.active,
    },
  });

  if (!userData) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User does not exists!');
  }

  let profileData;
  if (userData?.role === UserRole.super_admin) {
    profileData = await prisma.superAdmin.update({
      where: {
        email: userData.email,
      },
      data: req.body,
    });
  } else if (userData?.role === UserRole.company_admin) {
    profileData = await prisma.companyAdmin.findUnique({
      where: {
        email: userData.email,
      },
    });
  } else if (userData?.role === UserRole.business_instructors) {
    profileData = await prisma.businessInstructor.update({
      where: {
        email: userData.email,
      },
      data: req.body,
    });
  } else if (userData?.role === UserRole.employee) {
    profileData = await prisma.employee.update({
      where: {
        email: userData.email,
      },
      data: req.body,
    });
  }
  return { ...profileData, ...userData };
};

export const UserServices = {
  createDoctor,
  createAdmin,
  createPatient,
  createReceptionist,
  changeProfileStatus,
  getAllUser,
  getMyProfile,
  updateMyProfile,
};
