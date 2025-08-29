import { Prisma, RegisterWith, UserRole, UserStatus } from '@prisma/client';
import prisma from '../../utils/prisma';
import httpStatus from 'http-status';
import { hashedPassword } from './user.utils';
import { IBusinessInstructor, ICompanyAdmin, IEmployee, IInstructor, IStudent, IUserFilterRequest, IUserResponse } from './user.interface';
import { userSearchableFields } from './user.constant';
import ApiError from '../../errors/ApiError';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IGenericResponse } from '../../interfaces/common';
import { paginationHelpers } from '../../helpers/paginationHelper';

const createCompanyAdmin = async (payload: ICompanyAdmin): Promise<IUserResponse> => {
  const hashPassword = await hashedPassword(payload.password);

  const result = await prisma.$transaction(async transactionClient => {
    const user = await transactionClient.user.create({
      data: {
        name: payload.user.name,
        email: payload.user.email,
        password: hashPassword,
        role: UserRole.company_admin,
        registerWith: RegisterWith.credentials,
        // Create verification record at the same time
        verification: {
          create: {
            otp: '',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // now + 30 min
            status: false,
          },
        },
      },
    });

    await transactionClient.companyAdmin.create({
      data: {
        userId: user.id,
        ...payload.companyAdmin
      },
    });

    return user;
  });

  return result;
};

const createBusinessInstructor = async (
  payload: IBusinessInstructor,
): Promise<IUserResponse> => {
  const hashPassword = await hashedPassword(payload.password);

  const result = await prisma.$transaction(async transactionClient => {
    const user = await transactionClient.user.create({
      data: {
        name: payload.user.name,
        email: payload.user.email,
        password: hashPassword,
        role: UserRole.business_instructors,
        registerWith: RegisterWith.credentials,
        // Create verification record at the same time
        verification: {
          create: {
            otp: '',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // now + 30 min
            status: false,
          },
        },
      },
    });

    await transactionClient.businessInstructor.create({
      data: {
        userId: user.id,
        companyId: payload.businessInstructor.company,
      },
    });

    return user;
  });

  return result;
};

const createEmployee = async (payload: IEmployee): Promise<IUserResponse> => {
  const hashPassword = await hashedPassword(payload.password);

  const result = await prisma.$transaction(async transactionClient => {
    const user = await transactionClient.user.create({
      data: {
        name: payload.user.name,
        email: payload.user.email,
        password: hashPassword,
        role: UserRole.employee,
        registerWith: RegisterWith.credentials,
        // Create verification record at the same time
        verification: {
          create: {
            otp: '',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // now + 30 min
            status: false,
          },
        },
      },
    });

    await transactionClient.businessInstructor.create({
      data: {
        userId: user.id,
        companyId: payload.employee.company,
      },
    });

    return user;
  });

  return result;
};

const createInstructor = async (payload: IInstructor): Promise<IUserResponse> => {
  const hashPassword = await hashedPassword(payload.password);

  const result = await prisma.$transaction(async transactionClient => {
    const user = await transactionClient.user.create({
      data: {
        name: payload.user.name,
        email: payload.user.email,
        password: hashPassword,
        role: UserRole.instructor,
        registerWith: RegisterWith.credentials,
        // Create verification record at the same time
        verification: {
          create: {
            otp: '',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // now + 30 min
            status: false,
          },
        },
      },
    });

    await transactionClient.instructor.create({
      data: {
        userId: user.id,
        ...payload.instructor
      },
    });

    return user;
  });

  return result;
};

const createStudent = async (payload: IStudent): Promise<IUserResponse> => {
  const hashPassword = await hashedPassword(payload.password);

  const result = await prisma.$transaction(async transactionClient => {
    const user = await transactionClient.user.create({
      data: {
        name: payload.user.name,
        email: payload.user.email,
        password: hashPassword,
        role: UserRole.student,
        registerWith: RegisterWith.credentials,
      },
    });

    await transactionClient.student.create({
      data: {
        userId: user.id,
        ...payload.student
      },
    });

    return user;
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

const geUserById = async (userId: string) => {
  const userData = await prisma.user.findUnique({
    where: {
      id: userId,
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

const updateAProfile = async (userId: string, payload: any) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
      status: UserStatus.active,
    },
  });
  if (!user || user?.isDeleted) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User does not exists!');
  }

  const updateUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: payload.user,
  });

  // Update role-specific profile
  let profileData: any;

  switch (user.role) {
    case UserRole.super_admin:
      profileData = await prisma.superAdmin.update({
        where: { userId: user.id },
        data: payload.superAdmin ?? {},
      });
      break;

    case UserRole.company_admin:
      profileData = await prisma.companyAdmin.update({
        where: { userId: user.id },
        data: payload.companyAdmin ?? {},
      });
      break;

    case UserRole.business_instructors:
      profileData = await prisma.businessInstructor.update({
        where: { userId: user.id },
        data: payload.businessInstructor ?? {},
      });
      break;

    case UserRole.employee:
      profileData = await prisma.employee.update({
        where: { userId: user.id },
        data: payload.employee ?? {},
      });
      break;

    case UserRole.student:
      // Handle optional array and string fields
      profileData = await prisma.student.update({
        where: { userId: user.id },
        data: payload.student ?? {},
      });
      break;

    case UserRole.instructor:
      profileData = await prisma.instructor.update({
        where: { userId: user.id },
        data: payload.instructor ?? {},
      });
      break;

    default:
      profileData = null;
  }

  return {
    ...updateUser,
    ...profileData,
  };
};

const deleteAProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (!user || user?.isDeleted) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User does not exists!');
  }

  const updateUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      isDeleted: true,
      status: UserStatus.deleted,
    },
  });

  return updateUser;
};

export const UserServices = {
  createCompanyAdmin,
  createBusinessInstructor,
  createEmployee,
  createInstructor,
  createStudent,
  changeProfileStatus,
  getAllUser,
  geUserById,
  updateAProfile,
  deleteAProfile,
};
