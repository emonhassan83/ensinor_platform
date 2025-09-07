import { Employee, Instructor, Prisma, User, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IInstructorFilterRequest } from './instructors.interface';
import { instructorsSearchAbleFields } from './instructors.constant';
import prisma from '../../utils/prisma';
import { uploadToS3 } from '../../utils/s3';

const getAllFromDB = async (
  params: IInstructorFilterRequest,
  options: IPaginationOptions,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.InstructorWhereInput[] = [];

  // Search across Employee and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: [
        ...instructorsSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.InstructorWhereInput = { AND: andConditions };

  const result = await prisma.instructor.findMany({
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
    },
  });

  const total = await prisma.instructor.count({
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

const getByIdFromDB = async (id: string): Promise<Instructor | null> => {
  const result = await prisma.instructor.findUnique({
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

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: {
    instructor?: Partial<Instructor>;
    user?: Partial<User>;
  },
  file: any,
): Promise<Instructor> => {
  const instructor = await prisma.instructor.findUniqueOrThrow({
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
    // Update Instructor fields
    const updatedInstructor = payload.instructor
      ? await tx.instructor.update({
          where: { id },
          data: payload.instructor,
        })
      : instructor;

    // Update nested User fields
    if (payload.user) {
      await tx.user.update({
        where: { id: instructor.userId },
        data: payload.user,
      });
    }

    return updatedInstructor;
  });

  return updated;
};

const deleteFromDB = async (id: string): Promise<User> => {
  const instructor = await prisma.instructor.findUniqueOrThrow({
    where: { id },
  });

  const result = await prisma.$transaction(async tx => {
    const deletedUser = await tx.user.update({
      where: { id: instructor.userId },
      data: { status: UserStatus.deleted, isDeleted: true },
    });

    return deletedUser;
  });

  return result;
};

export const InstructorService = {
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
