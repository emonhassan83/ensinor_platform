import { BusinessInstructor, CompanyAdmin, Prisma, User, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IBusinessInstructorFilterRequest } from './businessInstructor.interface';
import { businessInstructorSearchAbleFields } from './businessInstructor.constant';
import prisma from '../../utils/prisma';

const getAllFromDB = async (
  params: IBusinessInstructorFilterRequest,
  options: IPaginationOptions,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.BusinessInstructorWhereInput[] = [];

  // Search across BusinessInstructor and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: [
        ...businessInstructorSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.BusinessInstructorWhereInput = { AND: andConditions };

  const result = await prisma.businessInstructor.findMany({
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

  const total = await prisma.businessInstructor.count({
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

const getByIdFromDB = async (id: string): Promise<BusinessInstructor | null> => {
  const result = await prisma.businessInstructor.findUnique({
    where: { id },
    include: { user: true, company: true },
  });

  return result;
};

const updateIntoDB = async (
  id: string,
data: { businessInstructor?: Partial<BusinessInstructor>; user?: Partial<User> }
): Promise<BusinessInstructor> => {
    const businessInstructor = await prisma.businessInstructor.findUniqueOrThrow({
    where: { id },
  });

    const updated = await prisma.$transaction(async (tx) => {
    // Update BusinessInstructor fields
    const updatedBusinessInstructor = data.businessInstructor
      ? await tx.businessInstructor.update({
          where: { id },
          data: data.businessInstructor,
        })
      : businessInstructor;

    // Update nested user fields
    if (data.user) {
      await tx.user.update({
        where: { id: businessInstructor.userId },
        data: data.user,
      });
    }

    return updatedBusinessInstructor;
  });

  return updated;
};

const deleteFromDB = async (id: string): Promise<User> => {
  const businessInstructor = await prisma.businessInstructor.findUniqueOrThrow({
    where: { id },
  });

  const result = await prisma.$transaction(async (tx) => {
    const deletedUser = await tx.user.update({
      where: { id: businessInstructor.userId },
      data: { status: UserStatus.deleted, isDeleted: true },
    });
    return deletedUser;
  });

  return result;
};

export const BusinessInstructorService = {
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
