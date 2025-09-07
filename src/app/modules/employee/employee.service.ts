import { Employee, Prisma, User, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IEmployeeFilterRequest } from './employee.interface';
import { employeeSearchAbleFields } from './employee.constant';
import prisma from '../../utils/prisma';
import { uploadToS3 } from '../../utils/s3';

const getAllFromDB = async (
  params: IEmployeeFilterRequest,
  options: IPaginationOptions,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.EmployeeWhereInput[] = [];

  // Search across Employee and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: [
        ...employeeSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.EmployeeWhereInput = { AND: andConditions };

  const result = await prisma.employee.findMany({
    where: whereConditions,
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
          id: true,
          name: true,
          email: true,
          photoUrl: true,
          companyAdmin: {
            select: {
              company: true,
            },
          },
        },
      },
    },
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

  const total = await prisma.employee.count({
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

const getByIdFromDB = async (id: string): Promise<Employee | null> => {
  const result = await prisma.employee.findUnique({
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
        },
      },
      company: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
          companyAdmin: {
            select: {
              company: true,
            },
          },
        },
      },
    },
  });

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: { employee?: Partial<Employee>; user?: Partial<any> },
  file: any,
): Promise<Employee> => {
  const employee = await prisma.employee.findUniqueOrThrow({
    where: { id },
  });

  // file upload
  if (file) {
    payload.user!.photoUrl = await uploadToS3({
      file: file,
      fileName: `images/user/photoUrl/${Math.floor(100000 + Math.random() * 900000)}`,
    });
  }

  const updated = await prisma.$transaction(async tx => {
    // Update Employee fields
    if (payload.employee) {
      await tx.employee.update({
        where: { id },
        data: payload.employee,
      });
    }

    // Update nested user fields
    if (payload.user) {
      await tx.user.update({
        where: { id: employee.userId },
        data: payload.user,
      });
    }

    // ✅ Always fetch with user populated
    const updatedEmployeeWithUser = await tx.employee.findUniqueOrThrow({
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
          },
        },
      },
    });

    return updatedEmployeeWithUser;
  });

  return updated;
};

const deleteFromDB = async (id: string): Promise<User> => {
  const employee = await prisma.employee.findUniqueOrThrow({
    where: { id },
  });

  const result = await prisma.$transaction(async tx => {
    const deletedUser = await tx.user.update({
      where: { id: employee.userId },
      data: { status: UserStatus.deleted, isDeleted: true },
    });
    return deletedUser;
  });

  return result;
};

export const EmployeeService = {
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
