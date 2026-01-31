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

  return await prisma.$transaction(async tx => {
    // 1. Check inviter (company admin)
    const inviter = await tx.user.findFirst({
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
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Inviter company is inactive!',
      );

    // 2. Subscription & invite limit check
    const activeSubscription = inviter.subscription[0];
    if (!activeSubscription)
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'No active subscription found!',
      );

    const companySize = inviter.companyAdmin.company.size;
    const subscriptionType = activeSubscription.type;

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

    // 3. Department validation
    const department = await tx.department.findFirst({
      where: { id: departmentId, author: { id: inviter.id }, isDeleted: false },
    });
    if (!department)
      throw new ApiError(httpStatus.BAD_REQUEST, 'Department not found!');

    // 4. Email check (with soft-delete support)
    const existingUser = await tx.user.findFirst({
      where: { email },
    });

    let newUser;

    if (existingUser) {
      if (!existingUser.isDeleted) {
        throw new ApiError(
          httpStatus.CONFLICT,
          `The email ${email} is already registered and active in the system.`,
        );
      }

      // Re-activate soft-deleted user
      console.log(`Re-activating soft-deleted employee: ${email}`);

      newUser = await tx.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          password: await hashedPassword(generateDefaultPassword(12)), // Reset password
          role: UserRole.employee,
          status: UserStatus.active,
          isDeleted: false,
          needsPasswordChange: false,
          passwordChangedAt: new Date(),
          verification: {
            update: {
              where: { userId: existingUser.id },
              data: { otp: '', expiresAt: null, status: true },
            },
          },
        },
        select: { id: true, name: true, email: true },
      });
    } else {
      // Create new user
      newUser = await tx.user.create({
        data: {
          name,
          email,
          password: await hashedPassword(generateDefaultPassword(12)),
          role: UserRole.employee,
          status: UserStatus.active,
          registerWith: RegisterWith.credentials,
          verification: {
            create: { otp: '', expiresAt: null, status: true },
          },
        },
        select: { id: true, name: true, email: true },
      });
    }

    // 5. Employee profile create (if not exists)
    const existingEmployee = await tx.employee.findUnique({
      where: { userId: newUser.id },
    });

    if (!existingEmployee) {
      await tx.employee.create({
        data: {
          userId: newUser.id,
          authorId: inviter.id,
          companyId: inviter.companyAdmin!.company!.id,
          departmentId,
        },
      });
    }

    // 6. Increment counters
    await tx.department.update({
      where: { id: departmentId },
      data: { joined: { increment: 1 } },
    });

    await tx.company.update({
      where: { id: inviter.companyAdmin!.company!.id },
      data: {
        employee: { increment: 1 },
        size: { increment: 1 },
      },
    });

    // 7. Send invitation email
    await sendEmployeeInvitationEmail(
      newUser.email,
      newUser.name,
      generateDefaultPassword(12), // Note: You may want to send the original generated password
      inviter.name,
      inviter.companyAdmin?.company?.name ?? '',
    );

    return { user: newUser };
  });
};

const bulkInsertIntoDB = async (payload: IGroupInvitation) => {
  const { userId, departmentId, emails, groupName } = payload;

  return await prisma.$transaction(async tx => {
    // 1. Validate inviter
    const inviter = await tx.user.findFirst({
      where: { id: userId, status: UserStatus.active, isDeleted: false },
      select: {
        id: true,
        name: true,
        companyAdmin: {
          select: {
            company: { select: { id: true, name: true, isActive: true, size: true } },
          },
        },
        subscription: {
          where: { isExpired: false, status: SubscriptionStatus.active },
          select: { type: true },
        },
      },
    });

    if (!inviter) throw new ApiError(httpStatus.BAD_REQUEST, 'Inviter not found!');
    if (!inviter.companyAdmin?.company)
      throw new ApiError(httpStatus.BAD_REQUEST, 'Inviter is not linked to any company!');
    if (!inviter.companyAdmin.company.isActive)
      throw new ApiError(httpStatus.BAD_REQUEST, 'Inviter company is inactive!');

    // 2. Subscription & invite limit check
    const activeSubscription = inviter.subscription[0];
    if (!activeSubscription) throw new ApiError(httpStatus.BAD_REQUEST, 'No active subscription found!');

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
        `Your subscription (${subscriptionType}) allows only ${maxAllowed} total members. You already have ${companySize}, so you can invite ${maxAllowed - companySize} more.`
      );
    }

    // 3. Validate department
    const department = await tx.department.findFirst({
      where: { id: departmentId, author: { id: inviter.id }, isDeleted: false },
    });
    if (!department) throw new ApiError(httpStatus.BAD_REQUEST, 'Department not found!');

    // 4. Check existing users (with soft-delete support)
    const existingUsers = await tx.user.findMany({
      where: { email: { in: emails } },
      select: { email: true, isDeleted: true },
    });

    const activeEmails = existingUsers.filter(u => !u.isDeleted).map(u => u.email);
    if (activeEmails.length > 0) {
      throw new ApiError(
        httpStatus.CONFLICT,
        `The following emails are already registered and active: ${activeEmails.join(', ')}`
      );
    }

    // 5. Process invitations
    const invitedEmployees: any[] = [];

    for (const email of emails) {
      const existingUser = existingUsers.find(u => u.email === email);

      let newUser;

      if (existingUser && existingUser.isDeleted) {
        // Re-activate soft-deleted user
        console.log(`Re-activating soft-deleted employee: ${email}`);

        newUser = await tx.user.update({
          where: { email },
          data: {
            name: groupName || 'Group Member', // Use groupName or default
            password: await hashedPassword(generateDefaultPassword(12)),
            role: UserRole.employee,
            status: UserStatus.active,
            isDeleted: false,
            needsPasswordChange: false,
            passwordChangedAt: new Date(),
            verification: {
              update: {
                where: { userId: (await tx.user.findUnique({ where: { email } }))!.id },
                data: { otp: '', expiresAt: null, status: true },
              },
            },
          },
          select: { id: true, name: true, email: true },
        });
      } else {
        // Create new user
        newUser = await tx.user.create({
          data: {
            name: groupName || 'Group Member',
            email,
            password: await hashedPassword(generateDefaultPassword(12)),
            role: UserRole.employee,
            status: UserStatus.active,
            registerWith: RegisterWith.credentials,
            verification: {
              create: { otp: '', expiresAt: null, status: true },
            },
          },
          select: { id: true, name: true, email: true },
        });
      }

      // Employee profile create (if not exists)
      const existingEmployee = await tx.employee.findUnique({
        where: { userId: newUser.id },
      });

      if (!existingEmployee) {
        await tx.employee.create({
          data: {
            userId: newUser.id,
            authorId: inviter.id,
            companyId: inviter.companyAdmin!.company!.id,
            departmentId,
          },
        });
      }

      invitedEmployees.push({ user: newUser });

      // Queue email (non-blocking)
      sendEmployeeInvitationEmail(
        newUser.email,
        newUser.name,
        generateDefaultPassword(12),
        inviter.name,
        inviter.companyAdmin?.company?.name ?? ''
      ).catch(console.error);
    }

    // 6. Increment counters
    await tx.department.update({
      where: { id: departmentId },
      data: { joined: { increment: emails.length } },
    });

    await tx.company.update({
      where: { id: inviter.companyAdmin!.company!.id },
      data: {
        employee: { increment: emails.length },
        size: { increment: emails.length },
      },
    });

    return invitedEmployees;
  });
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
