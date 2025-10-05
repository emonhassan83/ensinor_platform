import { Instructor, Prisma, User, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IInstructorFilterRequest } from './instructors.interface';
import { instructorsSearchAbleFields } from './instructors.constant';
import prisma from '../../utils/prisma';
import { uploadToS3 } from '../../utils/s3';
import ApiError from '../../errors/ApiError';

const expertInstructorsFromDB = async () => {
  const andConditions: Prisma.InstructorWhereInput[] = [];

  const whereConditions: Prisma.InstructorWhereInput = { AND: andConditions };

  const result = await prisma.instructor.findMany({
    where: whereConditions,
    take: 5,
    orderBy: [{ avgRating: 'desc' }, { ratingCount: 'desc' }],
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

  return result;
};

const getCombineInstructorFromDB = async (
  params: IInstructorFilterRequest,
  options: IPaginationOptions,
) => {
  const { page, limit } = paginationHelpers.calculatePagination(options);
  const { searchTerm, status, ...filterData } = params;

  // === Instructor Conditions ===
  const instructorConditions: Prisma.InstructorWhereInput[] = [];
  const businessInstructorConditions: Prisma.BusinessInstructorWhereInput[] = [];

  if (searchTerm) {
    const fieldConditions = (instructorsSearchAbleFields || []).map(field => ({
      [field]: { contains: searchTerm, mode: 'insensitive' },
    }));

    instructorConditions.push({
      OR: [
        ...fieldConditions,
        { user: { name: { contains: searchTerm, mode: 'insensitive' } } },
      ],
    });

    businessInstructorConditions.push({
      OR: [
        ...fieldConditions,
        { user: { name: { contains: searchTerm, mode: 'insensitive' } } },
      ],
    });
  }

  if (Object.keys(filterData).length > 0) {
    instructorConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: { equals: (filterData as any)[key] },
      })),
    });

    businessInstructorConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: { equals: (filterData as any)[key] },
      })),
    });
  }

  if (status) {
    instructorConditions.push({ user: { status: status as UserStatus } });
    businessInstructorConditions.push({
      user: { status: status as UserStatus },
    });
  }

  const whereInstructor: Prisma.InstructorWhereInput = {
    AND: instructorConditions,
  };
  const whereBusinessInstructor: Prisma.BusinessInstructorWhereInput = {
    AND: businessInstructorConditions,
  };

  // === Fetch all data (without skip/take) ===
  const [instructors, businessInstructors] = await Promise.all([
    prisma.instructor.findMany({
      where: whereInstructor,
      orderBy:
        options.sortBy && options.sortOrder
          ? { [options.sortBy]: options.sortOrder }
          : { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, photoUrl: true, bio: true, status: true },
        },
      },
    }),
    prisma.businessInstructor.findMany({
      where: whereBusinessInstructor,
      orderBy:
        options.sortBy && options.sortOrder
          ? { [options.sortBy]: options.sortOrder }
          : { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, photoUrl: true, status: true },
        },
        company: { select: { id: true, name: true } },
      },
    }),
  ]);

  // === Normalize + combine ===
  const normalizedInstructors = instructors.map(i => ({
    ...i,
    type: 'instructor',
  }));

  const normalizedBusinessInstructors = businessInstructors.map(bi => ({
    ...bi,
    type: 'business_instructor',
  }));

  const combined = [...normalizedInstructors, ...normalizedBusinessInstructors];

  // === Sort again after merge ===
  combined.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA; // newest first
  });

  // === Manual Pagination ===
  const total = combined.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = combined.slice(startIndex, endIndex);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: paginatedData,
  };
};

const getAllFromDB = async (
  params: IInstructorFilterRequest,
  options: IPaginationOptions,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, status, ...filterData } = params;

  const andConditions: Prisma.InstructorWhereInput[] = [];

  // Search across Employee and nested User fields
  if (searchTerm) {
    const companyAdminFieldsConditions = (instructorsSearchAbleFields || [])
      .filter(Boolean)
      .map(field => ({
        [field]: { contains: searchTerm, mode: 'insensitive' },
      }));

    const orConditions: Prisma.InstructorWhereInput[] = [];

    if (companyAdminFieldsConditions.length) {
      orConditions.push(...companyAdminFieldsConditions);
    }

    // Nested user search
    orConditions.push({
      user: {
        OR: [{ name: { contains: searchTerm, mode: 'insensitive' } }],
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

  const whereConditions: Prisma.InstructorWhereInput = { AND: andConditions };

  const instructors = await prisma.instructor.findMany({
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
          bio: true,
          status: true,
        },
      },
    },
  });

  // === Get Earnings grouped by instructor (authorId) ===
  const earnings = await prisma.payment.groupBy({
    by: ['authorId'],
    where: {
      isPaid: true,
      isDeleted: false,
    },
    _sum: {
      instructorShare: true,
    },
  });

  // === Map Instructor with totalEarning ===
  const result = instructors.map(inst => {
    const earningRow = earnings.find(e => e.authorId === inst.userId);
    const totalEarning = earningRow?._sum.instructorShare ?? 0;

    return {
      ...inst,
      totalEarning,
    };
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

const instructorCategories = async (): Promise<string[]> => {
  // 🔹 Instructor designations
  const instructors = await prisma.instructor.findMany({
    where: {
      designation: { not: '' },
    },
    distinct: ['designation'],
    select: { designation: true },
  });

  // 🔹 BusinessInstructor designations
  const businessInstructors = await prisma.businessInstructor.findMany({
    where: {
      designation: { not: '' },
    },
    distinct: ['designation'],
    select: { designation: true },
  });

  // 🔹 Merge & unique
  const allDesignations = [
    ...instructors.map(i => i.designation),
    ...businessInstructors.map(b => b.designation),
  ];

  // 🔹 Return unique & sorted
  return Array.from(new Set(allDesignations)).sort();
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

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Instructor not exists!');
  }
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
  const instructor = await prisma.instructor.findUnique({
    where: { id },
  });
  if (!instructor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Instructor not exists!');
  }

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
  const instructor = await prisma.instructor.findUnique({
    where: { id },
  });
  if (!instructor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Instructor not exists!');
  }

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
  instructorCategories,
  expertInstructorsFromDB,
  getAllFromDB,
  getCombineInstructorFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
