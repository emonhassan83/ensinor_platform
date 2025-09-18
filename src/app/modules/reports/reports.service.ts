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
  IQuizFilterRequest,
  IStudentFilterRequest,
  quizSearchAbleFields,
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
  companyId?: string,
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
  // Filter either by companyId
  if (companyId) {
    andConditions.push({ companyId });
  }

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

const revenueReports = async (options: IPaginationOptions) => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);

  // 1. Fetch monthly aggregated data
  const rawData = await prisma.$queryRaw<
    { year: number; month: number; type: string; total: number }[]
  >`
    SELECT 
      EXTRACT(YEAR FROM "createdAt") as year, 
      EXTRACT(MONTH FROM "createdAt") as month, 
      "type", 
      SUM("amount") as total
    FROM "payments"
    WHERE "isDeleted" = false
      AND "isPaid" = true
    GROUP BY year, month, "type"
    ORDER BY year, month;
  `;

  // 2. Transform result into monthly structure
  const monthlyMap: Record<string, any> = {};

  rawData.forEach(r => {
    const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        month: new Date(r.year, r.month - 1).toLocaleString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        course: 0,
        book: 0,
        event: 0,
        subscription: 0,
        total: 0,
        growth: 0,
      };
    }

    if (r.type === 'course') monthlyMap[key].course += Number(r.total);
    if (r.type === 'book') monthlyMap[key].book += Number(r.total);
    if (r.type === 'event') monthlyMap[key].event += Number(r.total);
    if (
      r.type === 'instructor_subscription' ||
      r.type === 'company_subscription'
    ) {
      monthlyMap[key].subscription += Number(r.total);
    }

    monthlyMap[key].total =
      monthlyMap[key].course +
      monthlyMap[key].book +
      monthlyMap[key].event +
      monthlyMap[key].subscription;
  });

  // 3. Calculate growth compared to previous month
  const months = Object.keys(monthlyMap).sort();
  let prevTotal = 0;

  months.forEach(m => {
    const current = monthlyMap[m];
    if (prevTotal > 0) {
      current.growth = Number(
        (((current.total - prevTotal) / prevTotal) * 100).toFixed(2),
      );
    } else {
      current.growth = 0;
    }
    prevTotal = current.total;
  });

  const allData = months.map(m => monthlyMap[m]);

  // 4. Apply pagination
  const paginatedData = allData.slice(skip, skip + limit);

  return {
    meta: {
      total: allData.length,
      page,
      limit,
    },
    data: paginatedData,
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

  // --- Fetch companies ---
  const companies = await prisma.company.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      employee: true,
      createdAt: true,
      updatedAt: true,
      course: {
        select: {
          id: true,
          enrollments: true,
          totalCompleted: true,
          createdAt: true,
        },
      },
    },
  });

  // --- Transform data ---
  const result = companies.map(company => {
    // 1. Aggregate enrollments + completions
    const totalEnrollments = company.course.reduce(
      (acc, c) => acc + (c.enrollments || 0),
      0,
    );
    const totalCompleted = company.course.reduce(
      (acc, c) => acc + (c.totalCompleted || 0),
      0,
    );

    // Safe division
    const completeRate =
      totalEnrollments > 0
        ? Number(((totalCompleted / totalEnrollments) * 100).toFixed(2))
        : 0;

    // 2. Monthly spend (based on enrollments trend)
    const monthlyMap: Record<string, { month: string; enrollments: number }> =
      {};

    company.course.forEach(course => {
      const key = `${course.createdAt.getFullYear()}-${String(
        course.createdAt.getMonth() + 1,
      ).padStart(2, '0')}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = {
          month: new Date(
            course.createdAt.getFullYear(),
            course.createdAt.getMonth(),
          ).toLocaleString('en-US', { month: 'short', year: 'numeric' }),
          enrollments: 0,
        };
      }
      monthlyMap[key].enrollments += course.enrollments || 0;
    });

    const monthlySpend = Object.values(monthlyMap).sort(
      (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime(),
    );

    return {
      id: company.id,
      name: company.name,
      employee: company.employee,
      completeRate,
      totalEnrollments,
      totalCompleted,
      monthlySpend,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  });

  const total = await prisma.company.count({ where: whereConditions });

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
  companyId?: string,
) => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.EventWhereInput[] = [
    {
      isDeleted: false,
    },
  ];
  // Filter either by companyId
  if (companyId) {
    andConditions.push({ companyId });
  }

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

  // --- Fetch events
  const events = await prisma.event.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      price: true,
      registered: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // --- Add totalSpend field
  const result = events.map(event => ({
    ...event,
    totalSpend: (event.registered || 0) * (event.price || 0),
  }));

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

const quizReports = async (
  params: IQuizFilterRequest,
  options: IPaginationOptions,
  courseId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.QuizWhereInput[] = [
    { courseId, isDeleted: false },
  ];

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: quizSearchAbleFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
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

  const whereConditions: Prisma.QuizWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.quiz.findMany({
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
  });

  const total = await prisma.quiz.count({
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

export const ReportsService = {
  studentReports,
  courseReports,
  revenueReports,
  businessReports,
  eventReports,
  quizReports,
};
