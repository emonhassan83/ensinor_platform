import {
  BusinessInstructor,
  CompanyAdmin,
  Employee,
  Instructor,
  Prisma,
  Student,
  SuperAdmin,
  UserRole,
  UserStatus,
} from '@prisma/client';
import prisma from '../../utils/prisma';
import httpStatus from 'http-status';
import { hashedPassword } from './user.utils';
import { IUser, IUserFilterRequest, IUserResponse } from './user.interface';
import { userSearchableFields } from './user.constant';
import { Request } from 'express';
import ApiError from '../../errors/ApiError';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IGenericResponse } from '../../interfaces/common';
import { paginationHelpers } from '../../helpers/paginationHelper';

const createCompanyAdmin = async (payload: any): Promise<CompanyAdmin> => {
  const hashPassword = await hashedPassword(payload.password);

  const result = await prisma.$transaction(async transactionClient => {
    await transactionClient.user.create({
      data: {
        name: payload.companyAdmin.name,
        email: payload.companyAdmin.email,
        password: hashPassword,
        role: UserRole.company_admin,
      },
    });

    const newCompanyAdmin = await transactionClient.companyAdmin.create({
      data: payload.companyAdmin,
    });

    return newCompanyAdmin;
  });

  return result;
};

const createBusinessInstructor = async (
  payload: any,
): Promise<BusinessInstructor> => {
  const hashPassword = await hashedPassword(payload.password);

  const result = await prisma.$transaction(async transactionClient => {
    await transactionClient.user.create({
      data: {
        name: payload.businessInstructor.name,
        email: payload.businessInstructor.email,
        password: hashPassword,
        role: UserRole.business_instructors,
      },
    });

    const newBusinessInstructor =
      await transactionClient.businessInstructor.create({
        data: payload.businessInstructor,
      });

    return newBusinessInstructor;
  });

  return result;
};

const createEmployee = async (payload: any): Promise<Employee> => {
  const hashPassword = await hashedPassword(payload.password);

  const result = await prisma.$transaction(async transactionClient => {
    await transactionClient.user.create({
      data: {
        name: payload.employee.name,
        email: payload.employee.email,
        password: hashPassword,
        role: UserRole.business_instructors,
      },
    });

    const newEmployee = await transactionClient.businessInstructor.create({
      data: payload.employee,
    });

    return newEmployee;
  });

  return result;
};

const createInstructor = async (payload: any): Promise<Instructor> => {
  const hashPassword = await hashedPassword(payload.password);

  const result = await prisma.$transaction(async transactionClient => {
    await transactionClient.user.create({
      data: {
        name: payload.instructor.name,
        email: payload.instructor.email,
        password: hashPassword,
        role: UserRole.instructor,
      },
    });

    const newInstructor = await transactionClient.instructor.create({
      data: payload.instructor,
    });

    return newInstructor;
  });

  return result;
};

const createStudent = async (payload: any): Promise<Student> => {
  const hashPassword = await hashedPassword(payload.password);

  const result = await prisma.$transaction(async transactionClient => {
    await transactionClient.user.create({
      data: {
        name: payload.student.name,
        email: payload.student.email,
        password: hashPassword,
        role: UserRole.student,
      },
    });

    const newStudent = await transactionClient.student.create({
      data: payload.student,
    });

    return newStudent;
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
): Promise<IGenericResponse<IUserResponse[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.UserWhereInput[] = [{ isDeleted: false }];

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
  });

  let profileData;
  if (userData?.role === UserRole.super_admin) {
    profileData = await prisma.superAdmin.findUnique({
      where: {
        userId: userData.id,
      },
    });
  } else if (userData?.role === UserRole.company_admin) {
    profileData = await prisma.companyAdmin.findUnique({
      where: {
        userId: userData.id,
      },
    });
  } else if (userData?.role === UserRole.business_instructors) {
    profileData = await prisma.businessInstructor.findUnique({
      where: {
        userId: userData.id,
      },
    });
  } else if (userData?.role === UserRole.employee) {
    profileData = await prisma.employee.findUnique({
      where: {
        userId: userData.id,
      },
    });
  } else if (userData?.role === UserRole.student) {
    profileData = await prisma.student.findUnique({
      where: {
        userId: userData.id,
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
    profileData = await prisma.superAdmin.findUnique({
      where: {
        userId: userData.id,
      },
    });
  } else if (userData?.role === UserRole.company_admin) {
    profileData = await prisma.companyAdmin.findUnique({
      where: {
        userId: userData.id,
      },
    });
  } else if (userData?.role === UserRole.business_instructors) {
    profileData = await prisma.businessInstructor.findUnique({
      where: {
        userId: userData.id,
      },
    });
  } else if (userData?.role === UserRole.employee) {
    profileData = await prisma.employee.findUnique({
      where: {
        userId: userData.id,
      },
    });
  } else if (userData?.role === UserRole.student) {
    profileData = await prisma.student.findUnique({
      where: {
        userId: userData.id,
      },
    });
  }
  return { ...profileData, ...userData };
};

export const UserServices = {
  createCompanyAdmin,
  createBusinessInstructor,
  createEmployee,
  createInstructor,
  createStudent,
  changeProfileStatus,
  getAllUser,
  getMyProfile,
  updateMyProfile,
};
