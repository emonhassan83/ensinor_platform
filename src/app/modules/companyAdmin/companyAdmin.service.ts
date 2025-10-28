import { CompanyAdmin, CoursesStatus, Prisma, User, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IBranding, ICompanyAdminFilterRequest } from './companyAdmin.interface';
import { companyAdminSearchAbleFields } from './companyAdmin.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { uploadToS3 } from '../../utils/s3';

const getAllFromDB = async (
  params: ICompanyAdminFilterRequest,
  options: IPaginationOptions,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, status, ...filterData } = params;

  const andConditions: Prisma.CompanyAdminWhereInput[] = [];

  // Search across CompanyAdmin and nested User, company fields
  if (searchTerm) {
    const companyAdminFieldsConditions = (companyAdminSearchAbleFields || [])
      .filter(Boolean)
      .map(field => ({
        [field]: { contains: searchTerm, mode: 'insensitive' },
      }));

    const orConditions: Prisma.CompanyAdminWhereInput[] = [];

    if (companyAdminFieldsConditions.length) {
      orConditions.push(...companyAdminFieldsConditions);
    }

    // Nested user search
    orConditions.push({
      user: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
    });

    andConditions.push({ OR: orConditions });
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

  // === FILTER BY USER STATUS ===
  if (status) {
    andConditions.push({
      user: {
        status: status as UserStatus,
      },
    });
  }

  const whereConditions: Prisma.CompanyAdminWhereInput = { AND: andConditions };

  const companyAdmins = await prisma.companyAdmin.findMany({
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
          status: true,
          subscription: {
            select: {
              type: true,
            },
          },
        },
      },
      company: {
        select: {
          id: true,
          name: true,
          industryType: true,
          logo: true,
          employee: true,
          instructor: true,
          courses: true,
        },
      },
    },
  });

    // === FETCH COMPANY EARNINGS IN BULK ===
  const companyIds = companyAdmins
    .map(ca => ca.company?.id)
    .filter(Boolean) as string[];

  const companyEarnings = await prisma.payment.groupBy({
    by: ['companyId'],
    where: {
      companyId: { in: companyIds },
      isPaid: true,
      isDeleted: false,
    },
    _sum: {
      amount: true,
    },
  });

  // Map companyId => totalEarning
  const earningsMap: Record<string, number> = {};
  companyEarnings.forEach(e => {
    if (e.companyId) earningsMap[e.companyId] = e._sum.amount || 0;
  });

  // === CALCULATE TOTAL ACTIVE COURSES PER COMPANY ===
  const activeCourses = await prisma.course.groupBy({
    by: ['companyId'],
    where: {
      companyId: { in: companyIds },
      status: CoursesStatus.approved, // assuming Course model has isActive field
      isDeleted: false,
    },
    _count: { id: true },
  });

  const courseMap: Record<string, number> = {};
  activeCourses.forEach(c => {
    if (c.companyId) courseMap[c.companyId] = c._count.id || 0;
  });

  // === MAP RESULTS WITH EARNINGS & ACTIVE COURSES ===
  const dataWithExtras = companyAdmins.map(ca => ({
    ...ca,
    companyEarning: ca.company?.id ? earningsMap[ca.company.id] || 0 : 0,
    activeCourses: ca.company?.id ? courseMap[ca.company.id] || 0 : 0,
  }));

  const total = await prisma.companyAdmin.count({
    where: whereConditions,
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: dataWithExtras,
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
          subscription: {
            select: {
              type: true,
              package: {
                select: {
                  title: true,
                  billingCycle: true,
                },
              },
            },
          },
        },
      },
      company: true
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Company admin not exists!');
  }
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
    throw new ApiError(httpStatus.NOT_FOUND, 'Company admin not exists!');
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

const changedBranding = async (
  userId: string,
  payload: IBranding,
  file?: Express.Multer.File,
) => {
  // 1️⃣ Find user and linked company admin
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
    include: { companyAdmin: true },
  });

  if (!user || !user.companyAdmin) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Company admin not found for this user!');
  }

  const companyAdmin = user.companyAdmin;

  // 2️⃣ Check if company exists
  const existingCompany = await prisma.company.findUnique({
    where: { userId: companyAdmin.id },
  });

  if (!existingCompany) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No company record found for this admin!');
  }

  // 3️⃣ Handle logo upload
  if (file) {
    const uploaded = await uploadToS3({
      file,
      fileName: `images/company/logo/${Math.floor(100000 + Math.random() * 900000)}`,
    });

    if (uploaded) {
      payload.logo = uploaded;
    }
  }

  // 4️⃣ Update branding details
  const updated = await prisma.company.update({
    where: { userId: companyAdmin.id },
    data: {
      ...(payload ?? {}),
      updatedAt: new Date(),
    },
  });

  return updated;
};

const deleteFromDB = async (id: string): Promise<User> => {
  const companyAdmin = await prisma.companyAdmin.findUniqueOrThrow({
    where: { id },
  });
  if (!companyAdmin) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Company admin not exists!');
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
  changedBranding,
  deleteFromDB,
};
