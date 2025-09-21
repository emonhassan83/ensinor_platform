import {
  BusinessInstructor,
  CompanyAdmin,
  Prisma,
  User,
  UserStatus,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IBusinessInstructorFilterRequest } from './businessInstructor.interface';
import { businessInstructorSearchAbleFields } from './businessInstructor.constant';
import prisma from '../../utils/prisma';
import { uploadToS3 } from '../../utils/s3';
import ApiError from '../../errors/ApiError';

const getAllFromDB = async (
  params: IBusinessInstructorFilterRequest,
  options: IPaginationOptions,
  userId: string
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, status, ...filterData } = params;

  const andConditions: Prisma.BusinessInstructorWhereInput[] = [{
    authorId: userId
  }];

  // Search across BusinessInstructor and nested User fields
  if (searchTerm) {
    const businessInstructorFieldsConditions = (
      businessInstructorSearchAbleFields || []
    )
      .filter(Boolean)
      .map(field => ({
        [field]: { contains: searchTerm, mode: 'insensitive' },
      }));

    const orConditions: Prisma.BusinessInstructorWhereInput[] = [];

    if (businessInstructorFieldsConditions.length) {
      orConditions.push(...businessInstructorFieldsConditions);
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

  const whereConditions: Prisma.BusinessInstructorWhereInput = {
    AND: andConditions,
  };

 // === FETCH BUSINESS INSTRUCTORS WITH USER DATA ===
  const instructors = await prisma.businessInstructor.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: 'desc' },
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
  });

  const instructorIds = instructors.map(i => i.id);

  // === TOTAL COURSES PER INSTRUCTOR ===
  const courses = await prisma.course.groupBy({
    by: ['instructorId'],
    where: {
      instructorId: { in: instructorIds },
      isDeleted: false,
    },
    _count: { id: true },
    _sum: { enrollments: true },
  });

  const courseMap: Record<string, { totalCourses: number; totalEnrolled: number }> = {};
  courses.forEach(c => {
    courseMap[c.instructorId] = {
      totalCourses: c._count.id || 0,
      totalEnrolled: c._sum.enrollments || 0,
    };
  });

  // === TOTAL INSTRUCTOR EARNING PER INSTRUCTOR ===
  const earnings = await prisma.payment.groupBy({
    by: ['authorId'],
    where: {
      authorId: { in: instructorIds },
      isPaid: true,
      isDeleted: false,
    },
    _sum: { instructorEarning: true },
  });

  const earningMap: Record<string, number> = {};
  earnings.forEach(e => {
    earningMap[e.authorId] = e._sum.instructorEarning || 0;
  });

  // === MAP RESULTS WITH CALCULATIONS ===
  const dataWithExtras = instructors.map(i => ({
    ...i,
    totalCourses: courseMap[i.id]?.totalCourses || 0,
    totalEnrolled: courseMap[i.id]?.totalEnrolled || 0,
    instructorEarning: earningMap[i.id] || 0,
  }));


  const total = await prisma.businessInstructor.count({
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

const getByIdFromDB = async (
  id: string,
): Promise<BusinessInstructor | null> => {
  const result = await prisma.businessInstructor.findUnique({
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
      author: {
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
      company: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Company instructor not exists!');
  }
  return result;
};

const updateIntoDB = async (
  id: string,
  payload: {
    businessInstructor?: Partial<BusinessInstructor>;
    user?: Partial<User>;
  },
  file: any,
): Promise<BusinessInstructor> => {
  const businessInstructor = await prisma.businessInstructor.findUniqueOrThrow({
    where: { id },
  });
  if (!businessInstructor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Company instructor not exists!');
  }

  // file upload
  if (file) {
    payload.user!.photoUrl = await uploadToS3({
      file: file,
      fileName: `images/user/photoUrl/${Math.floor(100000 + Math.random() * 900000)}`,
    });
  }

  const updated = await prisma.$transaction(async tx => {
    // Update BusinessInstructor fields
    const updatedBusinessInstructor = payload.businessInstructor
      ? await tx.businessInstructor.update({
          where: { id },
          data: payload.businessInstructor,
        })
      : businessInstructor;

    // Update nested user fields
    if (payload.user) {
      await tx.user.update({
        where: { id: businessInstructor.userId },
        data: payload.user,
      });
    }

    // Re-fetch with populated user
    return tx.businessInstructor.findUniqueOrThrow({
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
  });

  return updated;
};

const deleteFromDB = async (id: string): Promise<User> => {
  const businessInstructor = await prisma.businessInstructor.findUniqueOrThrow({
    where: { id },
  });
  if (!businessInstructor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Company instructor not exists!');
  }

  const result = await prisma.$transaction(async tx => {
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
