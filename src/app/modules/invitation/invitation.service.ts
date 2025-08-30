import {
  CompanyAdmin,
  CompanyRequest,
  Invitation,
  Prisma,
  User,
  UserStatus,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IGroupInvitation, IInvitation, IInvitationFilterRequest } from './invitation.interface';
import { invitationSearchAbleFields } from './invitation.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';

const insertIntoDB = async (payload: IInvitation) => {
  const result = await prisma.invitation.create({
    data: payload,
    include: { user: true },
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Company request creation failed!',
    );
  }
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
