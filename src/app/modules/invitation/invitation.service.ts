import {
  Invitation,
  Prisma,
  RegisterWith,
  SubscriptionStatus,
  SubscriptionType,
  UserRole,
  UserStatus,
} from '@prisma/client';
import httpStatus from 'http-status';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  IGroupInvitation,
  IInvitation,
  IInvitationFilterRequest,
} from './invitation.interface';
import { invitationSearchAbleFields } from './invitation.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { generateDefaultPassword } from '../../utils/passwordGenerator';
import { hashedPassword } from '../user/user.utils';
import { sendEmployeeInvitationEmail } from '../../utils/email/sentEmployeeInvitation';

const insertIntoDB = async (payload: IInvitation) => {
  const { userId, departmentId, name, email } = payload;

  // 1️⃣ Check if inviter (company admin) exists
  const inviter = await prisma.user.findFirst({
    where: { id: userId, status: UserStatus.active, isDeleted: false },
    select: {
      id: true,
      name: true,
      companyAdmin: {
        select: {
          company: {
            select: {
              id: true,
              name: true,
              isActive: true,
              size: true,
            },
          },
        },
      },
      subscription: {
        where: { isExpired: false, status: SubscriptionStatus.active },
        select: { type: true },
      },
    },
  });

  if (!inviter)
    throw new ApiError(httpStatus.BAD_REQUEST, 'Inviter not found!');

  if (!inviter.companyAdmin?.company)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Inviter is not linked to any company!',
    );
  if (!inviter.companyAdmin.company.isActive)
    throw new ApiError(httpStatus.BAD_REQUEST, 'Inviter company is inactive!');

  // 2️⃣ Determine subscription type & enforce invite limit
  const activeSubscription = inviter.subscription[0];
  if (!activeSubscription) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No active subscription found!');
  }

  const companySize = inviter.companyAdmin.company.size;
  const subscriptionType = activeSubscription.type;

  // 🔹 Define subscription limits
  const subscriptionLimits: Partial<Record<SubscriptionType, number>> = {
    ngo: 500,
    sme: 1000,
    enterprise: 3000,
  };

  const maxAllowed = subscriptionLimits[subscriptionType] ?? 0;
  if (companySize >= maxAllowed) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Your subscription (${subscriptionType}) allows a maximum of ${maxAllowed} members. Upgrade to invite more.`,
    );
  }

  // 3️⃣ Check department validity
  const department = await prisma.department.findFirst({
    where: { id: departmentId, author: { id: inviter.id }, isDeleted: false },
  });
  if (!department) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Department not found!');
  }

  // 4️⃣ Check if email already registered
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  if (existingUser) {
    throw new ApiError(
      httpStatus.CONFLICT,
      `The email ${email} is already registered in the system.`,
    );
  }

  // 5️⃣ Default password for invited employees (can be reset later)
  const defaultPassword = generateDefaultPassword(12);
  const hashPassword = await hashedPassword(defaultPassword);

  // 6️⃣ Create user + employee in a transaction
  const result = await prisma.$transaction(async tx => {
    const newUser = await tx.user.create({
      data: {
        name,
        email,
        password: hashPassword,
        role: UserRole.employee,
        status: UserStatus.active,
        registerWith: RegisterWith.credentials,
        verification: {
          create: {
            otp: '',
            expiresAt: null,
            status: true,
          },
        },
        expireAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
      },
    });

    const newEmployee = await tx.employee.create({
      data: {
        userId: newUser.id,
        authorId: inviter.id,
        companyId: inviter.companyAdmin!.company!.id,
        departmentId: departmentId,
      },
    });

    // 7️⃣ Send congratulation email
    await sendEmployeeInvitationEmail(
      newUser.email,
      newUser.name,
      defaultPassword,
      inviter.name,
      inviter.companyAdmin?.company?.name ?? '',
    );

    return { user: newUser, employee: newEmployee };
  });

  // 8️⃣ Increment company + department size
  await prisma.department.update({
    where: { id: department.id },
    data: {
      joined: { increment: 1 },
    },
  });
  await prisma.company.update({
    where: { id: inviter.companyAdmin!.company!.id },
    data: {
      employee: { increment: 1 },
      size: { increment: 1 },
    },
  });

  return result;
};

const bulkInsertIntoDB = async (payload: IGroupInvitation) => {
  const { userId, departmentId, emails, groupName } = payload;

  // 1. Validate inviter
  const inviter = await prisma.user.findFirst({
    where: { id: userId, status: UserStatus.active, isDeleted: false },
    select: {
      id: true,
      name: true,
      companyAdmin: {
        select: {
          company: {
            select: { id: true, name: true, isActive: true, size: true },
          },
        },
      },
      subscription: {
        where: { isExpired: false, status: SubscriptionStatus.active },
        select: { type: true },
      },
    },
  });

  if (!inviter)
    throw new ApiError(httpStatus.BAD_REQUEST, 'Inviter not found!');
  if (!inviter.companyAdmin?.company)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Inviter is not linked to any company!',
    );
  if (!inviter.companyAdmin.company.isActive)
    throw new ApiError(httpStatus.BAD_REQUEST, 'Inviter company is inactive!');

  // 2️⃣ Check active subscription and enforce limits
  const activeSubscription = inviter.subscription[0];
  if (!activeSubscription) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No active subscription found!');
  }

  const companySize = inviter.companyAdmin.company.size;
  const subscriptionType = activeSubscription.type;
  const newInvites = emails.length;

  const subscriptionLimits: Partial<Record<SubscriptionType, number>> = {
    standard: 0,
    ngo: 50,
    sme: 200,
    enterprise: 3000,
  };

  const maxAllowed = subscriptionLimits[subscriptionType] ?? 0;
  if (companySize + newInvites > maxAllowed) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Your subscription (${subscriptionType}) allows only ${maxAllowed} total members. You already have ${companySize}, so you can invite ${
        maxAllowed - companySize
      } more.`,
    );
  }

  // 2. Validate department
  const department = await prisma.department.findFirst({
    where: { id: departmentId, author: { id: inviter.id }, isDeleted: false },
  });
  if (!department) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Department not found!');
  }

  // 3. Check for existing users by email
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true },
  });
  if (existingUsers.length > 0) {
    const alreadyRegistered = existingUsers.map(u => u.email);
    throw new ApiError(
      httpStatus.CONFLICT,
      `The following emails are already registered: ${alreadyRegistered.join(', ')}`,
    );
  }

  // 4. Prepare invitations
  const defaultPassword = generateDefaultPassword(12);
  const hashPassword = await hashedPassword(defaultPassword);

  const results = await prisma.$transaction(async tx => {
    const invitedEmployees: any[] = [];

    for (const email of emails) {
      // Create User
      const user = await tx.user.create({
        data: {
          name: groupName, // or provide individual names if available
          email,
          password: hashPassword,
          role: UserRole.employee,
          status: UserStatus.active,
          registerWith: RegisterWith.credentials,
          verification: {
            create: { otp: '', expiresAt: null, status: true },
          },
        },
        select: { id: true, name: true, email: true },
      });

      // Create Employee
      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          authorId: inviter.id,
          companyId: inviter.companyAdmin!.company!.id,
          departmentId,
        },
      });

      // Queue Email (non-blocking)
      sendEmployeeInvitationEmail(
        user.email,
        user.name,
        defaultPassword,
        inviter.name,
        inviter.companyAdmin?.company?.name ?? '',
      ).catch(console.error);

      invitedEmployees.push({ user, employee });
    }

    // Increment department joined count
    await tx.department.update({
      where: { id: departmentId },
      data: { joined: { increment: emails.length } },
    });

    // here updated company info
    await prisma.company.update({
      where: { id: inviter.companyAdmin!.company!.id },
      data: {
        employee: { increment: emails.length },
        size: { increment: emails.length },
      },
    });

    return invitedEmployees;
  });

  return results;
};

const getAllFromDB = async (
  params: IInvitationFilterRequest,
  options: IPaginationOptions,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.InvitationWhereInput[] = [];

  // Search across Invitation and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: invitationSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.InvitationWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.invitation.findMany({
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
  });

  const total = await prisma.invitation.count({
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

const getByIdFromDB = async (id: string): Promise<Invitation | null> => {
  const result = await prisma.invitation.findUnique({
    where: { id },
    include: { user: true },
  });

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IInvitation>,
): Promise<Invitation> => {
  const invitation = await prisma.invitation.findUniqueOrThrow({
    where: { id },
  });
  if (!invitation) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invitation not found!');
  }

  const result = await prisma.invitation.update({
    where: { id },
    data: payload,
    include: { user: true, department: true },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invitation not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<Invitation> => {
  const invitation = await prisma.invitation.findUniqueOrThrow({
    where: { id },
  });
  if (!invitation) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invitation not found!');
  }

  const result = await prisma.invitation.delete({
    where: { id },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invitation not found!');
  }

  return result;
};

export const InvitationService = {
  insertIntoDB,
  bulkInsertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
