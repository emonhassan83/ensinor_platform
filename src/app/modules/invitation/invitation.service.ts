import {
  Invitation,
  Prisma,
  RegisterWith,
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

  // 1. Check if inviter (company admin) exists
  const inviter = await prisma.user.findFirst({
    where: { id: userId, status: UserStatus.active, isDeleted: false },
    select: {
      id: true,
      name: true,
      companyAdmin: {
        select: {
          company: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
  if (!inviter) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Inviter not found!');
  }

  // 2. Check department validity
  const department = await prisma.department.findFirst({
    where: { id: departmentId, author: { id: inviter.id }, isDeleted: false },
  });
  if (!department) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Department not found!');
  }

  // 3. Default password for invited employees (can be reset later)
  const defaultPassword = generateDefaultPassword(12);
  const hashPassword = await hashedPassword(defaultPassword);

  // 4. Create user + employee in a transaction
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
        companyId: inviter.id,
        departmentId: departmentId,
      },
    });

    // 5. Send congratulation email
    await sendEmployeeInvitationEmail(
      newUser.email,
      newUser.name,
      defaultPassword,
      inviter.name,
      inviter.companyAdmin?.company?.name ?? '',
    );

    return { user: newUser, employee: newEmployee };
  });

  return result;
};

const bulkInsertIntoDB = async (payload: IGroupInvitation) => {
  // Transform emails into multiple rows
  const invitations = payload.email.map(email => ({
    userId: payload.userId,
    departmentId: payload.departmentId,
    name: payload?.name ?? '',
    groupName: payload.groupName,
    email,
  }));

  try {
    // Insert multiple invitations
    await prisma.invitation.createMany({
      data: invitations,
      skipDuplicates: true, // important to avoid unique constraint errors
    });

    // If you also need the inserted rows with relations:
    const insertedInvitations = await prisma.invitation.findMany({
      where: {
        userId: payload.userId,
        departmentId: payload.departmentId,
        email: { in: payload.email },
      },
      include: { user: true, department: true },
    });

    return insertedInvitations;
  } catch (error: any) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      error.message || 'Invitation creation failed!',
    );
  }
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
