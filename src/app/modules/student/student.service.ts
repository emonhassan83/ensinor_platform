import { Prisma, Student, User, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IStudentFilterRequest } from './student.interface';
import { studentSearchAbleFields } from './student.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { uploadToS3 } from '../../utils/s3';
import httpStatus from 'http-status';

const getAllFromDB = async (
  params: IStudentFilterRequest,
  options: IPaginationOptions,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, status, ...filterData } = params;
  
  const andConditions: Prisma.StudentWhereInput[] = [];

  // Search across Employee and nested User fields
  if (searchTerm) {
    const studentFieldsConditions = (studentSearchAbleFields || [])
      .filter(Boolean)
      .map(field => ({
        [field]: { contains: searchTerm, mode: 'insensitive' },
      }));

    const orConditions: Prisma.StudentWhereInput[] = [];

    if (studentFieldsConditions.length) {
      orConditions.push(...studentFieldsConditions);
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

  const whereConditions: Prisma.StudentWhereInput = { AND: andConditions };

  const students = await prisma.student.findMany({
    where: whereConditions,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
          status: true,
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

  // === Add progress calculation ===
  const result = students.map(emp => {
    const { courseEnrolled, courseCompleted } = emp;
    const progress =
      courseEnrolled > 0
        ? Number(((courseCompleted / courseEnrolled) * 100).toFixed(2))
        : 0;

    return {
      ...emp,
      progress,
    };
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

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student not found!');
  }
  return result;
};

const updateIntoDB = async (
  id: string,
  payload: { student?: Partial<Student>; user?: Partial<User> },
  file: any,
): Promise<Student> => {
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student not found!');
  }

  // file upload
  if (file) {
    payload.user!.photoUrl = await uploadToS3({
      file: file,
      fileName: `images/user/photoUrl/${Math.floor(100000 + Math.random() * 900000)}`,
    });
  }

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
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student not found!');
  }

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
