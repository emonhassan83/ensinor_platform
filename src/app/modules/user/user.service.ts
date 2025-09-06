import { Prisma, RegisterWith, UserRole, UserStatus } from '@prisma/client';
import prisma from '../../utils/prisma';
import httpStatus from 'http-status';
import {
  hashedPassword,
  sendBusinessInstructorInvitationEmail,
  sendCompanyApprovalApprovalEmail,
} from './user.utils';
import {
  IBusinessInstructor,
  ICompanyAdmin,
  IEmployee,
  IInstructor,
  IRegisterUser,
  IStudent,
  IUserFilterRequest,
  IUserResponse,
} from './user.interface';
import { userSearchableFields } from './user.constant';
import ApiError from '../../errors/ApiError';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IGenericResponse } from '../../interfaces/common';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { generateDefaultPassword } from '../../utils/passwordGenerator';
import {
  sendUserActiveEmail,
  sendUserDeniedEmail,
} from '../../utils/email/sentUserStatusEmail';

const registerAUser = async (
  payload: IRegisterUser,
): Promise<IUserResponse> => {
  const { password, confirmPassword, user } = payload;

  if (password !== confirmPassword) {
    throw new ApiError(
      httpStatus.CONFLICT,
      'User password and confirm password do not match!',
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: user.email },
    include: { verification: true },
  });

  if (existingUser) {
    if (existingUser.isDeleted) {
      return prisma.user.update({
        where: { email: user.email },
        data: {
          ...user,
          password: await hashedPassword(password),
          photoUrl: payload.photoUrl,
          isDeleted: false,
          expireAt: new Date(Date.now() + 30 * 60 * 1000), // reset 30 min timer
          needsPasswordChange: false,
        },
      });
    }

    if (existingUser.verification && !existingUser.verification.status) {
      return prisma.user.update({
        where: { email: user.email },
        data: {
          ...user,
          password: await hashedPassword(password),
          photoUrl: payload.photoUrl,
          expireAt: new Date(Date.now() + 30 * 60 * 1000), // reset 30 min timer
          needsPasswordChange: false,
        },
      });
    }

    throw new ApiError(
      httpStatus.FORBIDDEN,
      'User already exists with this email',
    );
  }

  const hashPassword = await hashedPassword(password);

  // transaction ensures both user + verification created
  const newUser = await prisma.$transaction(async tx => {
    const userRecord = await tx.user.create({
      data: {
        name: user.name,
        email: user.email,
        password: hashPassword,
        photoUrl: payload.photoUrl,
        role: UserRole.student,
        registerWith: RegisterWith.credentials,
        expireAt: new Date(Date.now() + 30 * 60 * 1000), // auto-delete marker
        needsPasswordChange: false,
        verification: {
          create: {
            otp: '',
            expiresAt: new Date(Date.now() + 5 * 60 * 1000), // OTP expiry 5 min
            status: false,
          },
        },
      },
    });
    return userRecord;
  });

  return newUser;
};

const createCompanyAdmin = async (
  payload: ICompanyAdmin,
): Promise<IUserResponse> => {
  const password = generateDefaultPassword(12);
  const hashPassword = await hashedPassword(password);

  const result = await prisma.$transaction(async transactionClient => {
    // 1️⃣ Create User
    const user = await transactionClient.user.create({
      data: {
        name: payload.name, // Company admin name (you can separate if needed)
        email: payload.organizationEmail,
        password: hashPassword,
        role: UserRole.company_admin,
        registerWith: RegisterWith.credentials,
        verification: {
          create: {
            otp: '',
            expiresAt: null,
            status: true,
          },
        },
        status: UserStatus.active,
      },
    });

    // 2️⃣ Create CompanyAdmin
    const companyAdmin = await transactionClient.companyAdmin.create({
      data: {
        userId: user.id,
      },
    });

    // 3️⃣ Create Company
    await transactionClient.company.create({
      data: {
        userId: companyAdmin.id, // relation: Company → CompanyAdmin.id
        name: payload.name,
        industryType: payload.companyType,
        size: payload.companySize,
        employee: payload.numberOfPeopleToTrain,
        instructor: payload.trainingNeeds,
      },
    });

    // 4️⃣ Send email with credentials
    await sendCompanyApprovalApprovalEmail(user.email, user.name, password);

    return user;
  });

  return result;
};

const createBusinessInstructor = async (
  payload: IBusinessInstructor,
): Promise<IUserResponse> => {
  const { user, businessInstructor } = payload;
  const password = generateDefaultPassword(12);
  const hashPassword = await hashedPassword(password);

  const company = await prisma.user.findFirst({
    where: {
      id: businessInstructor.company,
      role: UserRole.company_admin,
      status: UserStatus.active,
      isDeleted: false,
    },
  });
  if (!company || company?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Company not found or deleted!');
  }

  const result = await prisma.$transaction(async transactionClient => {
    const userData = await transactionClient.user.create({
      data: {
        name: user.name,
        email: user.email,
        password: hashPassword,
        role: UserRole.business_instructors,
        registerWith: RegisterWith.credentials,
        // Create verification record at the same time
        verification: {
          create: {
            otp: '',
            expiresAt: null,
            status: true,
          },
        },
        status: UserStatus.active,
      },
    });

    await transactionClient.businessInstructor.create({
      data: {
        userId: userData.id,
        companyId: company.id,
        designation: businessInstructor.designation,
      },
    });

    // 4️⃣ Send email with credentials
    await sendBusinessInstructorInvitationEmail(
      userData.email,
      userData.name,
      password,
    );

    return userData;
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

    await transactionClient.employee.create({
      data: {
        userId: user.id,
        companyId: payload.employee.company,
      },
    });

    return user;
  });

  return result;
};

const createInstructor = async (
  payload: IInstructor,
): Promise<IUserResponse> => {
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
        ...payload.instructor,
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
        ...payload.student,
      },
    });

    return user;
  });

  return result;
};

const changeProfileStatus = async (
  userId: string,
  payload: { status: UserStatus },
) => {
  const { status } = payload;

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User does not exists!');
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: { status },
    select: {
      id: true,
      name: true,
      email: true,
      photoUrl: true,
      role: true,
      status: true,
      isDeleted: true,
    }
  });

  // 🎯 Send email based on status
  if (status === UserStatus.active) {
    await sendUserActiveEmail(user.email, user.name);
  } else if (status === UserStatus.denied) {
    await sendUserDeniedEmail(user.email, user.name);
  }

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
      isDeleted: false,
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
      isDeleted: false,
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
      ...payload.user,
      photoUrl: payload.photoUrl,
    },
  });

  // Update role-specific profile
  let profileData: any;

  switch (user.role) {
    case UserRole.super_admin:
      profileData = await prisma.superAdmin.upsert({
        where: { userId: user.id },
        update: payload.superAdmin ?? {},
        create: {
          userId: user.id,
          ...(payload.superAdmin ?? {}),
        },
      });
      break;

    case UserRole.company_admin:
      profileData = await prisma.companyAdmin.upsert({
        where: { userId: user.id },
        update: payload.companyAdmin ?? {},
        create: {
          userId: user.id,
          ...(payload.companyAdmin ?? {}),
        },
      });
      break;

    case UserRole.business_instructors:
      console.log({ user });
      profileData = await prisma.businessInstructor.upsert({
        where: { userId: user.id },
        update: payload.businessInstructor ?? {},
        create: {
          userId: user.id,
          ...(payload.businessInstructor ?? {}),
        },
      });
      break;

    case UserRole.employee:
      profileData = await prisma.employee.upsert({
        where: { userId: user.id },
        update: payload.employee ?? {},
        create: {
          userId: user.id,
          ...(payload.employee ?? {}),
        },
      });
      break;

    case UserRole.student:
      profileData = await prisma.student.upsert({
        where: { userId: user.id },
        update: payload.student ?? {},
        create: {
          userId: user.id,
          ...(payload.student ?? {}),
        },
      });
      break;

    case UserRole.instructor:
      profileData = await prisma.instructor.upsert({
        where: { userId: user.id },
        update: payload.instructor ?? {},
        create: {
          userId: user.id,
          ...(payload.instructor ?? {}),
        },
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
  registerAUser,
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
