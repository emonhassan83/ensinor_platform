import {
  CompanyRequest,
  Prisma,
  RegisterWith,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  ICompanyRequest,
  ICompanyRequestFilterRequest,
} from './companyRequest.interface';
import { companyRequestSearchAbleFields } from './companyRequest.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';
import { hashedPassword } from '../user/user.utils';
import { generateDefaultPassword } from '../../utils/passwordGenerator';
import {
  sendCompanyApprovalEmail,
  sendCompanyDenialEmail,
} from '../../utils/email/sentCompanyStatusEmail';
import { joinInitialAnnouncementChat } from '../../utils/joinInitialAnnouncementChat';

const insertIntoDB = async (payload: ICompanyRequest) => {
  // check previous status validation
  const existingPendingRequest = await prisma.companyRequest.findFirst({
    where: {
      organizationEmail: payload.organizationEmail,
    },
  });

  if (existingPendingRequest) {
    throw new ApiError(
      httpStatus.CONFLICT,
      'You already have a company request with this email.',
    );
  }

  // Organization email duplicate check
  const existingOrgEmail = await prisma.user.findUnique({
    where: { email: payload.organizationEmail },
  });
  if (existingOrgEmail) {
    throw new ApiError(
      httpStatus.CONFLICT,
      'This organization email is already used try another email !',
    );
  }

  const result = await prisma.companyRequest.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Company request creation failed!',
    );
  }

  return result;
};

const getAllFromDB = async (
  params: ICompanyRequestFilterRequest,
  options: IPaginationOptions,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.CompanyRequestWhereInput[] = [];

  // Search across CompanyRequest and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: companyRequestSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.CompanyRequestWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.companyRequest.findMany({
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

  const total = await prisma.companyRequest.count({
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

const getByIdFromDB = async (id: string): Promise<CompanyRequest | null> => {
  const result = await prisma.companyRequest.findUnique({
    where: { id },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Company request not found!');
  }
  return result;
};

const updateIntoDB = async (
  id: string,
  payload: { status: UserStatus },
): Promise<CompanyRequest | null> => {
  const { status } = payload;

  const request = await prisma.companyRequest.findUnique({
    where: { id },
  });
  if (!request) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Company request not found!');
  }

  // Approve and create company + admin
  if (status === UserStatus.active) {
    const password = generateDefaultPassword(12); // random secure password
    const hashPassword = await hashedPassword(password);

    const result = await prisma.$transaction(async transactionClient => {
      const updatedRequest = await transactionClient.companyRequest.update({
        where: { id },
        data: { status: UserStatus.active },
      });

      const user = await transactionClient.user.create({
        data: {
          name: updatedRequest.name,
          email: updatedRequest.organizationEmail,
          password: hashPassword,
          role: UserRole.company_admin,
          registerWith: RegisterWith.credentials,
          verification: {
            create: { otp: '', expiresAt: null, status: true },
          },
          status: UserStatus.active,
        },
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
          status: true,
        },
      });

      const companyAdmin = await transactionClient.companyAdmin.create({
        data: { userId: user.id },
      });

      await transactionClient.company.create({
        data: {
          userId: companyAdmin.userId,
          name: updatedRequest.name,
          industryType: updatedRequest.platformType,
        },
      });

      // Auto-join company announcements chat
      await joinInitialAnnouncementChat(
        user.id,
        UserRole.company_admin,
        transactionClient,
      );
      
      // Send approval email with credentials
      await sendCompanyApprovalEmail(user.email, user.name, password);

      return updatedRequest;
    });

    return result;
  }

  // Deny and delete request
  if (status === UserStatus.denied) {
    await prisma.companyRequest.delete({ where: { id } });

    // Send denial email
    await sendCompanyDenialEmail(request.organizationEmail, request.name);

    return null;
  }

  // Other status update
  const result = await prisma.companyRequest.update({
    where: { id },
    data: { status },
  });

  return result;
};

const deleteFromDB = async (id: string): Promise<CompanyRequest> => {
  const companyReq = await prisma.companyRequest.findUniqueOrThrow({
    where: { id },
  });
  if (!companyReq) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Company request not found!');
  }

  const result = await prisma.companyRequest.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Company request not found!');
  }

  return result;
};

export const CompanyRequestService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
