import {
  CoInstructor,
  CompanyType,
  CoursesStatus,
  Prisma,
  SubscriptionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
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
import { sendCoInstructorNotification } from './coInstructors.utils';

const inviteCoInstructor = async (payload: ICoInstructors) => {
  const { invitedById, coInstructorId, courseId } = payload;

  // 1️⃣ Validate inviter (must be active instructor/business instructor)
  const inviter = await prisma.user.findFirst({
    where: {
      id: invitedById,
      status: UserStatus.active,
      isDeleted: false,
      role: { in: [UserRole.instructor, UserRole.business_instructors] },
    },
    include: {
      subscription: true,
      businessInstructor: { include: { company: true } },
    },
  });
  if (!inviter) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Inviter not found or not eligible',
    );
  }

  // 🧭 1.1 Validate instructor’s active subscription
  if (inviter.role === UserRole.instructor) {
    const activeSubscription = inviter.subscription.find(
      sub =>
        sub.status === SubscriptionStatus.active &&
        sub.isExpired === false &&
        sub.isDeleted === false &&
        new Date(sub.expiredAt) > new Date(),
    );

    if (!activeSubscription) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'You need an active subscription to invite a co-instructor.',
      );
    }
  }

  // 2️⃣ Validate course
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      status: CoursesStatus.approved,
      isDeleted: false,
    },
    include: { coInstructor: true },
  });
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found or inactive');
  }

  // 3️⃣ Validate inviter authority:
  //    - Either course main instructor
  //    - Or already an existing co-instructor of the course
  const isMainInstructor = course.authorId === invitedById;
  const isExistingCoInstructor = course.coInstructor.some(
    ci => ci.coInstructorId === invitedById && !ci.isDeleted,
  );

  if (!isMainInstructor && !isExistingCoInstructor) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Only main or existing co-instructors can invite',
    );
  }

  // 4️⃣ Validate co-instructor user
  const coInstructorUser = await prisma.user.findFirst({
    where: {
      id: coInstructorId,
      role: { in: [UserRole.instructor, UserRole.business_instructors] },
      // status: UserStatus.active,
      isDeleted: false,
    },
  });
  if (!coInstructorUser) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Co-Instructor user not found');
  }

  //4.1: Validate vo instructor user
  if (invitedById === coInstructorId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'You cannot invite yourself as a co-instructor.',
    );
  }

  // 5️⃣ Determine max allowed co-instructors based on company type
  let maxCoInstructors = 5; // default for enterprise
  if (
    inviter.role === UserRole.business_instructors &&
    inviter.businessInstructor?.company
  ) {
    const companyType = inviter.businessInstructor.company.industryType;
    if (companyType === CompanyType.ngo) maxCoInstructors = 2;
    else if (companyType === CompanyType.sme) maxCoInstructors = 3;
    else maxCoInstructors = 5; // enterprise
  }

  // 6️⃣ Count current co-instructors for this course
  const coInstructorCount = await prisma.coInstructor.count({
    where: { courseId, isDeleted: false },
  });
  if (coInstructorCount >= maxCoInstructors) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Maximum ${maxCoInstructors} co-instructors allowed for this course based on your company type`,
    );
  }

  // 6️⃣ Prevent duplicate invitation
  const existingCoInstructor = await prisma.coInstructor.findFirst({
    where: { courseId, coInstructorId, isDeleted: false },
  });
  if (existingCoInstructor) {
    throw new ApiError(
      httpStatus.CONFLICT,
      'This co-instructor is already invited to the course',
    );
  }

  // 7️⃣ Create co-instructor entry
  const coInstructor = await prisma.coInstructor.create({
    data: payload,
  });
  if (!coInstructor) {
    throw new ApiError(httpStatus.CONFLICT, 'Co-Instructor creation failed!');
  }

  // 8️⃣ Send email + notification
  await sendCoInstructorInvitationEmail(
    coInstructorUser.email,
    coInstructorUser.name,
    inviter.name,
    course.title,
  );

  await sendCoInstructorNotification(
    inviter,
    coInstructor.coInstructorId,
    'invitation',
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
  const inviter = await prisma.user.findUnique({
    where: { id: coInstructor.invitedById, isDeleted: false },
  });
  if (!inviter) {
    throw new ApiError(httpStatus.CONFLICT, 'You have no access to revoke!');
  }

  const result = await prisma.coInstructor.update({
    where: { id },
    data: { isActive: false },
  });
  if (!result) {
    throw new ApiError(httpStatus.CONFLICT, 'Co instructors not revoked !');
  }

  // sent notification to invitee
  await sendCoInstructorNotification(
    inviter,
    coInstructor.coInstructorId,
    'revoke',
  );

  return result;
};

const deleteIntoDB = async (id: string): Promise<CoInstructor> => {
  const coInstructor = await prisma.coInstructor.findUnique({
    where: { id, isDeleted: false },
  });
  if (!coInstructor) {
    throw new ApiError(httpStatus.CONFLICT, 'Co instructor found !');
  }

  const inviter = await prisma.coInstructor.findUnique({
    where: { id: coInstructor.invitedById, isDeleted: false },
  });
  if (!inviter) {
    throw new ApiError(httpStatus.CONFLICT, 'You have no access to revoke!');
  }

  const result = await prisma.coInstructor.update({
    where: { id },
    data: { isDeleted: true },
  });
  if (!result) {
    throw new ApiError(httpStatus.CONFLICT, 'Co instructors not deleted !');
  }

  // sent notification to invitee
  await sendCoInstructorNotification(inviter, coInstructor.id, 'deleted');

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
