import {
  CompanyType,
  Prisma,
  RegisterWith,
  UserRole,
  UserStatus,
} from '@prisma/client';
import prisma from '../../utils/prisma';
import httpStatus from 'http-status';
import {
  hashedPassword,
  sendInstructorRequestNotification,
  sendInvitationNotification,
  sendUserStatusNotifYToAdmin,
  sendUserStatusNotifYToUser,
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
import { sendCompanyApprovalEmail } from '../../utils/email/sentCompanyStatusEmail';
import { sendBusinessInstructorInvitation } from '../../utils/email/sentBusinessInstructorInvitation';
import {
  sendInstructorInvitationEmail,
  sendInstructorRequestEmail,
} from '../../utils/email/sentInstructorEmail';
import { sendStudentInvitationEmail } from '../../utils/email/sentStudentInvitation';
import { sendEmployeeInvitationEmail } from '../../utils/email/sentEmployeeInvitation';
import { joinInitialAnnouncementChat } from '../../utils/joinInitialAnnouncementChat';

const INSTRUCTOR_LIMIT_BY_INDUSTRY: Record<CompanyType, number> = {
  ngo: 2,
  sme: 3,
  enterprise: 5,
};

const getActiveSubscription = async (userId: string) => {
  return prisma.subscription.findFirst({
    where: {
      userId,
      isDeleted: false,
      isExpired: false,
      expiredAt: { gt: new Date() },
    },
    select: {
      type: true,
    },
  });
};

// TODO: here when register a user then created a student table as well
const registerAUser = async (
  payload: IRegisterUser,
): Promise<IUserResponse> => {
  const { password, confirmPassword, user } = payload;

  /* --------------------------------------------
     1️⃣ Password validation
  --------------------------------------------- */
  if (password !== confirmPassword) {
    throw new ApiError(
      httpStatus.CONFLICT,
      'User password and confirm password do not match!',
    );
  }

  /* --------------------------------------------
     2️⃣ Existing user check
  --------------------------------------------- */
  const existingUser = await prisma.user.findUnique({
    where: { email: user.email },
    include: { verification: true },
  });

  if (existingUser) {
    const hashed = await hashedPassword(password);

    // Re-activate deleted user
    if (existingUser.isDeleted) {
      return prisma.user.update({
        where: { email: user.email },
        data: {
          ...user,
          password: hashed,
          photoUrl: payload.photoUrl,
          isDeleted: false,
          expireAt: new Date(Date.now() + 30 * 60 * 1000),
          needsPasswordChange: false,
        },
      });
    }

    // Re-send verification if not verified
    if (existingUser.verification && !existingUser.verification.status) {
      return prisma.user.update({
        where: { email: user.email },
        data: {
          ...user,
          password: hashed,
          photoUrl: payload.photoUrl,
          expireAt: new Date(Date.now() + 30 * 60 * 1000),
          needsPasswordChange: false,
        },
      });
    }

    throw new ApiError(
      httpStatus.FORBIDDEN,
      'User already exists with this email',
    );
  }

  /* --------------------------------------------
     3️⃣ Create User (Transaction Safe)
  --------------------------------------------- */
  const hashedPasswordValue = await hashedPassword(password);

  const newUser = await prisma.$transaction(async tx => {
    // ✅ Create user
    const userRecord = await tx.user.create({
      data: {
        name: user.name,
        email: user.email,
        password: hashedPasswordValue,
        photoUrl: payload.photoUrl,
        role: UserRole.student,
        registerWith: RegisterWith.credentials,
        expireAt: new Date(Date.now() + 30 * 60 * 1000),
        needsPasswordChange: false,
        status: UserStatus.active,
        verification: {
          create: {
            otp: '',
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            status: false,
          },
        },
      },
    });

    // ✅ Auto-join announcement chat
    await joinInitialAnnouncementChat(userRecord.id, UserRole.student, tx);

    // ✅ Create Student profile
    await tx.student.create({
      data: {
        userId: userRecord.id,
      },
    });

    return userRecord;
  });

  return newUser;
};

const invitationCompanyAdmin = async (
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
        contactNo: payload.phoneNumber,
        password: hashPassword,
        role: UserRole.company_admin,
        bio: payload.description,
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
        industryType: payload.industryType,
      },
    });

    // 4️⃣ Send email with credentials
    await sendCompanyApprovalEmail(user.email, user.name, password);

    // 4️⃣ Auto-join company announcements chat (SAFE)
    await joinInitialAnnouncementChat(
      user.id,
      UserRole.company_admin,
      transactionClient,
    );

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

  /* --------------------------------------------
     1️⃣ Fetch Company + Industry Info
  --------------------------------------------- */
  const companyAdmin = await prisma.user.findFirst({
    where: {
      id: businessInstructor.authorId,
      role: UserRole.company_admin,
      status: UserStatus.active,
      isDeleted: false,
    },
    select: {
      companyAdmin: {
        select: {
          company: {
            select: {
              id: true,
              industryType: true,
              instructor: true,
            },
          },
        },
      },
    },
  });

  if (!companyAdmin?.companyAdmin?.company) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Company admin or company not found!',
    );
  }

  const company = companyAdmin.companyAdmin.company;

  /* --------------------------------------------
     2️⃣ Enforce Industry-based Instructor Limit
  --------------------------------------------- */
  const instructorLimit = INSTRUCTOR_LIMIT_BY_INDUSTRY[company.industryType];

  if (company.instructor >= instructorLimit) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      `Instructor limit exceeded. 
       ${company.industryType.toUpperCase()} companies can invite up to ${instructorLimit} instructors.`,
    );
  }

  /* --------------------------------------------
     3️⃣ Email uniqueness check
  --------------------------------------------- */
  const isExist = await prisma.user.findFirst({
    where: {
      email: user.email,
      isDeleted: false,
    },
  });

  if (isExist) {
    throw new ApiError(
      httpStatus.CONFLICT,
      'This email already exists on the platform!',
    );
  }

  /* --------------------------------------------
     4️⃣ Transaction: Create Instructor
  --------------------------------------------- */
  const result = await prisma.$transaction(async tx => {
    // Create user
    const userData = await tx.user.create({
      data: {
        name: user.name,
        email: user.email,
        password: hashPassword,
        role: UserRole.business_instructors,
        registerWith: RegisterWith.credentials,
        status: UserStatus.active,
        verification: {
          create: {
            otp: '',
            expiresAt: null,
            status: true,
          },
        },
      },
    });

    // Create business instructor
    await tx.businessInstructor.create({
      data: {
        userId: userData.id,
        authorId: businessInstructor.authorId,
        companyId: company.id,
        designation: businessInstructor.designation,
      },
    });

    // Update company counters
    await tx.company.update({
      where: { id: company.id },
      data: {
        instructor: { increment: 1 },
        size: { increment: 1 },
      },
    });

    // Send invitation email
    await sendBusinessInstructorInvitation(
      userData.email,
      userData.name,
      password,
    );

    return userData;
  });

  /* --------------------------------------------
     5️⃣ Send Notification
  --------------------------------------------- */
  await sendInvitationNotification(
    companyAdmin,
    result.id,
    'business-instructor',
  );

  return result;
};

const createEmployee = async (payload: IEmployee): Promise<IUserResponse> => {
  const { user: userPayload, employee } = payload;
  const password = generateDefaultPassword(12);
  const hashPassword = await hashedPassword(password);

  const company = await prisma.user.findFirst({
    where: {
      id: employee.authorId,
      role: UserRole.company_admin,
      status: UserStatus.active,
      isDeleted: false,
    },
    select: {
      companyAdmin: {
        select: {
          user: {
            select: {
              name: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
  if (!company) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Company admin not found or deleted!',
    );
  }

  const department = await prisma.department.findFirst({
    where: {
      id: employee.departmentId,
      authorId: employee.authorId,
      isDeleted: false,
    },
  });
  if (!department) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Department not found or deleted!',
    );
  }

  const isExist = await prisma.user.findFirst({
    where: {
      email: payload.user.email,
      status: UserStatus.active,
      isDeleted: false,
    },
  });
  if (isExist) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'This email already exist in this platform!',
    );
  }

  const result = await prisma.$transaction(async transactionClient => {
    const user = await transactionClient.user.create({
      data: {
        name: userPayload.name,
        email: userPayload.email,
        password: hashPassword,
        role: UserRole.employee,
        registerWith: RegisterWith.credentials,
        status: UserStatus.active,
        // Create verification record at the same time
        verification: {
          create: {
            otp: '',
            expiresAt: null,
            status: true,
          },
        },
      },
    });

    await transactionClient.employee.create({
      data: {
        userId: user.id,
        authorId: employee.authorId,
        companyId: company.companyAdmin!.company!.id,
        departmentId: employee.departmentId,
      },
    });

    // here updated company info
    await prisma.company.update({
      where: { id: company.companyAdmin!.company!.id },
      data: {
        employee: { increment: 1 },
        size: { increment: 1 },
      },
    });

    // 4️⃣ Send email with credentials
    await sendEmployeeInvitationEmail(
      user.email,
      user.name,
      password,
      company.companyAdmin!.company!.name,
      company.companyAdmin!.user.name,
    );

    return user;
  });

  // 4️⃣ Send notify to invitee
  if (company && result) {
    await sendInvitationNotification(company, result.id, 'employee');
  }

  return result;
};

const createInstructor = async (
  payload: IInstructor,
): Promise<IUserResponse> => {
  const password = generateDefaultPassword(12);
  const hashPassword = await hashedPassword(password);

  const isExist = await prisma.user.findFirst({
    where: {
      email: payload.user.email,
    },
  });
  if (isExist) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'This email already exist in this platform!',
    );
  }

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
            expiresAt: null,
            status: true,
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

    // Auto-join company announcements chat
    await joinInitialAnnouncementChat(
      user.id,
      UserRole.instructor,
      transactionClient,
    );

    // 4️⃣ Send email with credentials
    await sendInstructorRequestEmail(user.email, user.name, password);

    // sent admin tp invitee notify
    await sendInstructorRequestNotification(user, 'instructor');

    return user;
  });

  return result;
};

const invitationInstructor = async (
  payload: IInstructor,
  userId: string,
): Promise<IUserResponse> => {
  const password = generateDefaultPassword(12);
  const hashPassword = await hashedPassword(password);

  const author = await prisma.user.findFirst({
    where: {
      id: userId,
      role: UserRole.super_admin,
      status: UserStatus.active,
      isDeleted: false,
    },
  });
  if (!author) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invitee author not found!');
  }

  const isExist = await prisma.user.findFirst({
    where: {
      email: payload.user.email,
    },
  });
  if (isExist) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'This email already exist in this platform!',
    );
  }

  const result = await prisma.$transaction(async transactionClient => {
    const user = await transactionClient.user.create({
      data: {
        name: payload.user.name,
        email: payload.user.email,
        contactNo: payload.user.contactNo,
        bio: payload.user.bio,
        password: hashPassword,
        role: UserRole.instructor,
        registerWith: RegisterWith.credentials,
        status: UserStatus.active,
        // Create verification record at the same time
        verification: {
          create: {
            otp: '',
            expiresAt: null,
            status: true,
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

    // Auto-join company instructor chat
    await joinInitialAnnouncementChat(
      user.id,
      UserRole.instructor,
      transactionClient,
    );

    // 4️⃣ Send email with credentials
    await sendInstructorInvitationEmail(user.email, user.name, password);

    return user;
  });

  // 4️⃣ Send notify to invitee
  if (author && result) {
    await sendInvitationNotification(author, result.id, 'instructor');
  }

  return result;
};

const createStudent = async (
  payload: IStudent,
  userId: string,
): Promise<IUserResponse> => {
  const password = generateDefaultPassword(12);
  const hashPassword = await hashedPassword(password);

  const author = await prisma.user.findFirst({
    where: {
      id: userId,
      role: UserRole.super_admin,
      status: UserStatus.active,
      isDeleted: false,
    },
  });
  if (!author) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invitee author not found!');
  }

  const isExist = await prisma.user.findFirst({
    where: {
      email: payload.user.email,
    },
  });
  if (isExist) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'This email already exist in this platform!',
    );
  }

  const result = await prisma.$transaction(async transactionClient => {
    const user = await transactionClient.user.create({
      data: {
        name: payload.user.name,
        email: payload.user.email,
        contactNo: payload.user.contactNo,
        password: hashPassword,
        role: UserRole.student,
        registerWith: RegisterWith.credentials,
        status: UserStatus.active,
        // Create verification record at the same time
        verification: {
          create: {
            otp: '',
            expiresAt: null,
            status: true,
          },
        },
      },
    });

    await transactionClient.student.create({
      data: {
        userId: user.id,
        ...payload.student,
      },
    });

    // ✅ FIX: pass transaction client
    await joinInitialAnnouncementChat(
      user.id,
      UserRole.student,
      transactionClient,
    );

    // 4️⃣ Send email with credentials
    await sendStudentInvitationEmail(user.email, user.name, password);

    return user;
  });

  // 4️⃣ Send notify to invitee
  if (author && result) {
    await sendInvitationNotification(author, result.id, 'student');
  }

  return result;
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
    where: { id: userId, isDeleted: false },
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
      storage: true,
      status: true,
      lastActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!userData) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');
  }

  let profileData: any = null;
  let subscriptionOwnerId = userId;

  switch (userData.role) {
    case UserRole.super_admin:
      profileData = await prisma.superAdmin.findUnique({ where: { userId } });
      break;

    case UserRole.company_admin:
      profileData = await prisma.companyAdmin.findUnique({
        where: { userId },
        include: { company: true },
      });
      break;

    case UserRole.business_instructors:
      profileData = await prisma.businessInstructor.findUnique({
        where: { userId },
        include: {
          company: true,
          author: {
            select: { id: true },
          },
        },
      });

      // 🔑 subscription inherited from company admin
      subscriptionOwnerId = profileData?.authorId;
      break;

    case UserRole.instructor:
      profileData = await prisma.instructor.findUnique({ where: { userId } });
      break;

    case UserRole.employee:
      profileData = await prisma.employee.findUnique({
        where: { userId },
        include: { company: true, department: true },
      });
      break;

    case UserRole.student:
      profileData = await prisma.student.findUnique({ where: { userId } });
      break;
  }

  // ✅ Subscription resolution (single source of truth)
  const activeSubscription = subscriptionOwnerId
    ? await getActiveSubscription(subscriptionOwnerId)
    : null;

  return {
    ...userData,
    ...profileData,
    isActiveSubscription: Boolean(activeSubscription),
    subscriptionType: activeSubscription?.type ?? null,
  };
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

const changeProfileStatus = async (
  userId: string,
  payload: { status: UserStatus },
) => {
  const { status } = payload;

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
      isDeleted: false,
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
    },
  });

  // 🎯 Send email and notification based on status
  await sendUserStatusNotifYToAdmin(status, user);
  await sendUserStatusNotifYToUser(status, user);

  if (status === UserStatus.active) {
    await sendUserActiveEmail(user.email, user.name);
  } else if (status === UserStatus.denied) {
    await sendUserDeniedEmail(user.email, user.name);
  }

  return updatedUser;
};

const deleteAProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
      isDeleted: false,
    },
  });
  if (!user) {
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

  // 🎯 Send notification based on status
  await sendUserStatusNotifYToUser('deleted', user);

  return updateUser;
};

export const UserServices = {
  registerAUser,
  invitationCompanyAdmin,
  createBusinessInstructor,
  createEmployee,
  createInstructor,
  invitationInstructor,
  createStudent,
  changeProfileStatus,
  getAllUser,
  geUserById,
  updateAProfile,
  deleteAProfile,
};
