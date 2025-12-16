import {
  CoInstructor,
  CompanyType,
  CoursesStatus,
  Prisma,
  Subscription,
  SubscriptionStatus,
  SubscriptionType,
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

  // 1️⃣ Validate inviter
  const inviter = await prisma.user.findFirst({
    where: {
      id: invitedById,
      role: { in: [UserRole.instructor, UserRole.business_instructors] },
      status: UserStatus.active,
      isDeleted: false,
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

  // 2️⃣ Resolve active subscription (ONLY for instructors)
  let activeSubscription: Subscription | null = null;

  if (inviter.role === UserRole.instructor) {
    activeSubscription =
      inviter.subscription.find(
        sub =>
          sub.status === SubscriptionStatus.active &&
          !sub.isExpired &&
          !sub.isDeleted &&
          new Date(sub.expiredAt) > new Date(),
      ) || null;

    if (!activeSubscription) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'You must have an active subscription to invite co-instructors.',
      );
    }
  }

  // 3️⃣ Validate course
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

  // 4️⃣ Validate inviter authority
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

  // 5️⃣ Validate co-instructor user
  if (invitedById === coInstructorId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'You cannot invite yourself as a co-instructor.',
    );
  }

  const coInstructorUser = await prisma.user.findFirst({
    where: {
      id: coInstructorId,
      role: { in: [UserRole.instructor, UserRole.business_instructors] },
      isDeleted: false,
    },
  });

  if (!coInstructorUser) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Co-instructor user not found');
  }

  // 6️⃣ Determine max allowed co-instructors
  let maxCoInstructors = 0;

  // 🔹 Instructor logic (subscription-based)
  if (inviter.role === UserRole.instructor && activeSubscription) {
    if (activeSubscription.type === SubscriptionType.standard) {
      maxCoInstructors = 1;
    } else if (activeSubscription.type === SubscriptionType.premium) {
      maxCoInstructors = 5;
    }
  }

  // 🔹 Business instructor logic (company-based)
  if (
    inviter.role === UserRole.business_instructors &&
    inviter.businessInstructor?.company
  ) {
    const companyType = inviter.businessInstructor.company.industryType;

    if (companyType === CompanyType.ngo) maxCoInstructors = 2;
    else if (companyType === CompanyType.sme) maxCoInstructors = 3;
    else maxCoInstructors = 5; // enterprise
  }

  // 7️⃣ Count existing co-instructors
  const coInstructorCount = await prisma.coInstructor.count({
    where: { courseId, isDeleted: false },
  });

  if (coInstructorCount >= maxCoInstructors) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `You can invite a maximum of ${maxCoInstructors} co-instructor(s) for this course.`,
    );
  }

  // 8️⃣ Prevent duplicate
  const existingCoInstructor = await prisma.coInstructor.findFirst({
    where: { courseId, coInstructorId, isDeleted: false },
  });

  if (existingCoInstructor) {
    throw new ApiError(
      httpStatus.CONFLICT,
      'This co-instructor is already added to the course.',
    );
  }

  // 9️⃣ Create co-instructor
  const coInstructor = await prisma.coInstructor.create({
    data: payload,
  });

  if (!coInstructor) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Co-instructor creation failed.',
    );
  }

  // 🔔 Notifications
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
