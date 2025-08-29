import { Instructor, Prisma, Student, User, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IStudentFilterRequest } from './student.interface';
import { studentSearchAbleFields } from './student.constant';
import prisma from '../../utils/prisma';

const getAllFromDB = async (
  params: IStudentFilterRequest,
  options: IPaginationOptions,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.StudentWhereInput[] = [];

  // Search across Employee and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: [
        ...studentSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.StudentWhereInput = { AND: andConditions };

  const result = await prisma.student.findMany({
    where: whereConditions,
    include: { user: true },
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

  const total = await prisma.student.count({
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

const getByIdFromDB = async (id: string): Promise<Student | null> => {
  const result = await prisma.student.findUnique({
    where: { id },
    include: { user: true },
  });

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: { student?: Partial<Student>; user?: Partial<User> }
): Promise<Student> => {
  const student = await prisma.student.findUniqueOrThrow({ where: { id } });

  const updated = await prisma.$transaction(async tx => {
    // Update Student fields
    const updatedStudent = payload.student
      ? await tx.student.update({
          where: { id },
          data: payload.student,
        })
      : student;

    // Update nested User fields
    if (payload.user) {
      await tx.user.update({
        where: { id: student.userId },
        data: payload.user,
      });
    }

    return updatedStudent;
  });

  return updated;
};

const deleteFromDB = async (id: string): Promise<User> => {
  const student = await prisma.student.findUniqueOrThrow({ where: { id } });

  const result = await prisma.$transaction(async tx => {
    const deletedUser = await tx.user.update({
      where: { id: student.userId },
      data: { status: UserStatus.deleted, isDeleted: true },
    });
    return deletedUser;
  });

  return result;
};

export const StudentService = {
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
