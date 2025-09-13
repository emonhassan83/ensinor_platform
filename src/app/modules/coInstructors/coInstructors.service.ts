import { CoInstructor, Instructor, Prisma, User, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  ICoInstructors,
  ICoInstructorFilterRequest,
} from './coInstructors.interface';
import { coInstructorsSearchAbleFields } from './coInstructors.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';

const inviteCoInstructor = async (
  inviterId: string,
  payload: ICoInstructors,
) => {
  // Check course belongs to inviter
  const course = await prisma.course.findFirst({
    where: { id: payload.courseId, instructorId: inviterId },
  });
  if (!course)
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Course not found or access denied',
    );

  // Check co-instructor exists
  const coInstructorUser = await prisma.user.findUnique({
    where: { id: payload.coInstructorId },
  });
  if (!coInstructorUser)
    throw new ApiError(httpStatus.NOT_FOUND, 'Co-Instructor user not found');

  // Create co-instructor entry
  const coInstructor = await prisma.coInstructor.create({
    data: payload,
  });

  return coInstructor;
};

const getAllFromDB = async (
  params: ICoInstructorFilterRequest,
  options: IPaginationOptions,
  invitedById: string
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.CoInstructorWhereInput[] = [{isDeleted: false, invitedById}];

  // Search across Employee and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: [
        ...coInstructorsSearchAbleFields.map(field => ({
          [field]: { contains: searchTerm, mode: 'insensitive' },
        })),
        { coInstructorUser: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { coInstructorUser: { email: { contains: searchTerm, mode: 'insensitive' } } },
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

  const whereConditions: Prisma.CoInstructorWhereInput = { AND: andConditions };

  const result = await prisma.coInstructor.findMany({
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
      coInstructorUser: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
        },
      },
    },
  });

  const total = await prisma.coInstructor.count({
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

const getByIdFromDB = async (id: string): Promise<CoInstructor | null> => {
  const result = await prisma.coInstructor.findUnique({
    where: { id },
    include: {
      coInstructorUser: {
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

const getCoInstructorCourses = async (coInstructorId: string) => {
  return prisma.coInstructor.findMany({
    where: { coInstructorId, isActive: true },
    include: { course: true, invitedBy: true },
  });
};

const updateIntoDB = async (
  id: string,
  payload: {
    instructor?: Partial<Instructor>;
    user?: Partial<User>;
  }
): Promise<Instructor> => {
  const instructor = await prisma.instructor.findUniqueOrThrow({
    where: { id },
  });

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

const revokeAccess = async (id: string): Promise<User> => {
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

export const CoInstructorService = {
  inviteCoInstructor,
  getAllFromDB,
  getByIdFromDB,
  getCoInstructorCourses,
  updateIntoDB,
  revokeAccess,
};
