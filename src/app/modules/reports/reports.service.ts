import {
  UserRole,
  CoursesStatus,
  CourseType,
  Prisma,
  UserStatus,
} from '@prisma/client';
import prisma from '../../utils/prisma';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IGenericResponse } from '../../interfaces/common';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IUserResponse } from '../user/user.interface';
import {
  businessSearchableFields,
  courseSearchableFields,
  IBusinessFilterRequest,
  ICourseFilterRequest,
  IEventFilterRequest,
  IStudentFilterRequest,
  studentSearchableFields,
} from './reports.constant';

const studentReports = async (
  filters: IStudentFilterRequest,
  options: IPaginationOptions,
): Promise<IGenericResponse<IUserResponse[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.UserWhereInput[] = [
    { role: UserRole.student, status: UserStatus.active, isDeleted: false },
  ];

  if (searchTerm) {
    andConditions.push({
      OR: studentSearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  const whereConditions: Prisma.UserWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.user.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: 'desc',
          },
    select: {
      id: true,
      name: true,
      email: true,
      photoUrl: true,
      lastActive: true,
      role: true,
      status: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
      student: {
        select: {
          courseEnrolled: true,
          courseCompleted: true,
        },
      },
    },
  });
  const total = await prisma.user.count({
    where: whereConditions,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

const courseReports = async (
  filters: ICourseFilterRequest,
  options: IPaginationOptions,
) => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.CourseWhereInput[] = [
    {
      type: CourseType.external,
      status: CoursesStatus.approved,
      isDeleted: false,
    },
  ];

  if (searchTerm) {
    andConditions.push({
      OR: courseSearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  const whereConditions: Prisma.CourseWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.course.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: 'desc',
          },
    select: {
      id: true,
      title: true,
      enrollments: true,
      totalCompleted: true,
      avgRating: true,
      instructor: {
        select: {
          name: true,
        },
      },
      status: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Add completeRate calculation
  const dataWithCompleteRate = result.map(course => {
    const completeRate =
      course.enrollments > 0
        ? Math.round((course.totalCompleted / course.enrollments) * 100)
        : 0;

    return {
      ...course,
      completeRate,
    };
  });

  const total = await prisma.course.count({
    where: whereConditions,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: dataWithCompleteRate,
  };
};

const revenueReports = async (
  filters: ICourseFilterRequest,
  options: IPaginationOptions,
) => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.CourseWhereInput[] = [
    {
      type: CourseType.external,
      status: CoursesStatus.approved,
      isDeleted: false,
    },
  ];

  if (searchTerm) {
    andConditions.push({
      OR: courseSearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  const whereConditions: Prisma.CourseWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.course.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: 'desc',
          },
    select: {
      id: true,
      title: true,
      enrollments: true,
      totalCompleted: true,
      avgRating: true,
      instructor: {
        select: {
          name: true,
        },
      },
      status: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const total = await prisma.course.count({
    where: whereConditions,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

const businessReports = async (
  filters: IBusinessFilterRequest,
  options: IPaginationOptions,
) => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.CompanyWhereInput[] = [{ isDeleted: false }];

  if (searchTerm) {
    andConditions.push({
      OR: businessSearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  const whereConditions: Prisma.CompanyWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.company.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: 'desc',
          },
    select: {
      id: true,
      name: true,
      employee: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const total = await prisma.company.count({
    where: whereConditions,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

const eventReports = async (
  filters: IEventFilterRequest,
  options: IPaginationOptions,
) => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.EventWhereInput[] = [
    {
      isDeleted: false,
    },
  ];

  if (searchTerm) {
    andConditions.push({
      OR: courseSearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  const whereConditions: Prisma.EventWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.event.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: 'desc',
          },
    select: {
      id: true,
      title: true,
      registered: true,
      
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const total = await prisma.event.count({
    where: whereConditions,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

export const ReportsService = {
  studentReports,
  courseReports,
  revenueReports,
  businessReports,
  eventReports,
};
