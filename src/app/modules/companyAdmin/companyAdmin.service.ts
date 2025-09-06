import { CompanyAdmin, Prisma, User, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { ICompanyAdminFilterRequest } from './companyAdmin.interface';
import { companyAdminSearchAbleFields } from './companyAdmin.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { uploadToS3 } from '../../utils/s3';

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
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
        },
      },
      company: {
        select: {
          name: true,
          industryType: true,
          logo: true,
          color: true,
          employee: true,
          instructor: true,
          size: true,
        },
      },
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
    include: {
      user: {
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
          status: true,
          lastActive: true,
          isDeleted: true,
        },
      },
      company: {
        select: {
          name: true,
          industryType: true,
          logo: true,
          color: true,
          employee: true,
          instructor: true,
          size: true,
        },
      },
    },
  });

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: { company?: Partial<CompanyAdmin>; user?: Partial<any> },
  file: any,
): Promise<CompanyAdmin> => {
  const companyAdmin = await prisma.companyAdmin.findUniqueOrThrow({
    where: { id },
  });
  if (!companyAdmin) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Company admin not exists!');
  }

  // file upload
  if (file) {
    payload.user!.photoUrl = await uploadToS3({
      file: file,
      fileName: `images/user/photoUrl/${Math.floor(100000 + Math.random() * 900000)}`,
    });
  }

  // Perform update
  const updated = await prisma.companyAdmin.update({
    where: { id },
    data: {
      user: payload.user
        ? {
            update: {
              ...(payload.user ?? {}),
            },
          }
        : undefined,
      company: payload.company
        ? {
            update: {
              ...(payload.company ?? {}),
            },
          }
        : undefined,
    },
    include: {
      user: {
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
          status: true,
          lastActive: true,
          isDeleted: true,
        },
      },
      company: true,
    },
  });

  return updated;
};

const deleteFromDB = async (id: string): Promise<User> => {
  const companyAdmin = await prisma.companyAdmin.findUniqueOrThrow({
    where: { id },
  });
  if (!companyAdmin) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Company admin not exists!');
  }

  const result = await prisma.$transaction(async tx => {
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
