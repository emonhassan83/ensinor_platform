import { CoInstructor, Prisma, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  ICoInstructors,
  ICoInstructorFilterRequest,
} from './coInstructors.interface';
import { coInstructorsSearchAbleFields } from './coInstructors.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { sendCoInstructorInvitationEmail } from '../../utils/email/sentCoInstructorInvitation';
import httpStatus from 'http-status';

const inviteCoInstructor = async (payload: ICoInstructors) => {
  const { invitedById, coInstructorId, courseId } = payload;

  // Check course belongs to inviter
  const course = await prisma.course.findFirst({
    where: { id: courseId, instructorId: invitedById },
  });
  if (!course)
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Course not found or access denied',
    );

  // Check inviter exists
  const inviter = await prisma.user.findUnique({
    where: { id: invitedById, status: UserStatus.active, isDeleted: false },
  });
  if (!inviter) throw new ApiError(httpStatus.NOT_FOUND, 'Inviter not found');

  // Check co-instructor exists
  const coInstructorUser = await prisma.user.findUnique({
    where: { id: coInstructorId, status: UserStatus.active, isDeleted: false },
  });
  if (!coInstructorUser)
    throw new ApiError(httpStatus.NOT_FOUND, 'Co-Instructor user not found');

  // Create co-instructor entry
  const coInstructor = await prisma.coInstructor.create({
    data: payload,
  });
  if (!coInstructor) {
    throw new ApiError(httpStatus.CONFLICT, 'Co-Instructor creation failed!');
  }

  // Send email
  await sendCoInstructorInvitationEmail(
    coInstructorUser.email,
    coInstructorUser.name,
    inviter.name,
    course.title,
  );

  return coInstructor;
};

const getAllFromDB = async (
  params: ICoInstructorFilterRequest,
  options: IPaginationOptions,
  invitedById: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.CoInstructorWhereInput[] = [
    { isDeleted: false, invitedById },
  ];

  // Search across Employee and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: [
        ...coInstructorsSearchAbleFields.map(field => ({
          [field]: { contains: searchTerm, mode: 'insensitive' },
        })),
        {
          coInstructorUser: {
            name: { contains: searchTerm, mode: 'insensitive' },
          },
        },
        {
          coInstructorUser: {
            email: { contains: searchTerm, mode: 'insensitive' },
          },
        },
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
      course: {
        select: {
          title: true,
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
    where: { id, isDeleted: false },
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
      course: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.CONFLICT, 'Co instructors not found !');
  }
  return result;
};

const getCoInstructorCourses = async (coInstructorId: string) => {
  const result = await prisma.coInstructor.findMany({
    where: { coInstructorId, isActive: true },
    include: {
      course: true,
      invitedBy: {
        select: { id: true, name: true, email: true, photoUrl: true },
      },
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.CONFLICT, 'Co instructors classes found !');
  }
  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<CoInstructor>,
): Promise<CoInstructor> => {
  const coInstructor = await prisma.coInstructor.findUnique({
    where: { id, isDeleted: false },
  });
  if (!coInstructor) {
    throw new ApiError(httpStatus.CONFLICT, 'Co instructor found !');
  }

  const updated = await prisma.coInstructor.update({
    where: { id },
    data: payload,
  });
  if (!updated) {
    throw new ApiError(httpStatus.CONFLICT, 'Co instructors not updated !');
  }

  return updated;
};

const revokeAccess = async (id: string): Promise<CoInstructor> => {
  const coInstructor = await prisma.coInstructor.findUnique({
    where: { id, isDeleted: false },
  });
  if (!coInstructor) {
    throw new ApiError(httpStatus.CONFLICT, 'Co instructor found !');
  }

  const result = await prisma.coInstructor.update({
    where: { id },
    data: { isActive: false },
  });
  if (!result) {
    throw new ApiError(httpStatus.CONFLICT, 'Co instructors not revoked !');
  }

  return result;
};

const deleteIntoDB = async (id: string): Promise<CoInstructor> => {
  const coInstructor = await prisma.coInstructor.findUnique({
    where: { id, isDeleted: false },
  });
  if (!coInstructor) {
    throw new ApiError(httpStatus.CONFLICT, 'Co instructor found !');
  }

  const result = await prisma.coInstructor.update({
    where: { id },
    data: { isDeleted: true },
  });
  if (!result) {
    throw new ApiError(httpStatus.CONFLICT, 'Co instructors not deleted !');
  }

  return result;
};

export const CoInstructorService = {
  inviteCoInstructor,
  getAllFromDB,
  getByIdFromDB,
  getCoInstructorCourses,
  updateIntoDB,
  revokeAccess,
  deleteIntoDB,
};
