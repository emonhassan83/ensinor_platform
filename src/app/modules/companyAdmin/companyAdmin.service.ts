import { CompanyAdmin, Prisma, User, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { ICompanyAdminFilterRequest } from './companyAdmin.interface';
import { companyAdminSearchAbleFields } from './companyAdmin.constant';
import prisma from '../../utils/prisma';

const getAllFromDB = async (
  params: ICompanyAdminFilterRequest,
  options: IPaginationOptions,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.CompanyAdminWhereInput[] = [];

  // Search across CompanyAdmin and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: [
        ...companyAdminSearchAbleFields.map(field => ({
          [field]: { contains: searchTerm, mode: 'insensitive' },
        })),
        { user: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { user: { email: { contains: searchTerm, mode: 'insensitive' } } },
      ],
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

  const whereConditions: Prisma.CompanyAdminWhereInput = { AND: andConditions };

  const result = await prisma.companyAdmin.findMany({
    where: whereConditions,
    include: { user: true, company: true },
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

  const total = await prisma.companyAdmin.count({
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

const getByIdFromDB = async (id: string): Promise<CompanyAdmin | null> => {
  const result = await prisma.companyAdmin.findUnique({
    where: { id },
    include: { user: true, company: true },
  });

  return result;
};

const updateIntoDB = async (
  id: string,
payload: { companyAdmin?: Partial<CompanyAdmin>; user?: Partial<any> }
): Promise<CompanyAdmin> => {
    const companyAdmin = await prisma.companyAdmin.findUniqueOrThrow({
    where: { id },
  });

    const updated = await prisma.$transaction(async (tx) => {
    // Update CompanyAdmin fields
    const updatedCompanyAdmin = payload.companyAdmin
      ? await tx.companyAdmin.update({
          where: { id },
          data: payload.companyAdmin,
        })
      : companyAdmin;

    // Update nested user fields
    if (payload.user) {
      await tx.user.update({
        where: { id: companyAdmin.userId },
        data: payload.user,
      });
    }

    return updatedCompanyAdmin;
  });

  return updated;
};

const deleteFromDB = async (id: string): Promise<User> => {
  const companyAdmin = await prisma.companyAdmin.findUniqueOrThrow({
    where: { id },
  });

  const result = await prisma.$transaction(async (tx) => {
    const deletedUser = await tx.user.update({
      where: { id: companyAdmin.userId },
      data: { status: UserStatus.deleted, isDeleted: true },
    });
    return deletedUser;
  });

  return result;
};

export const CompanyAdminService = {
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
