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
  courseSearchableFields,
  ICourseFilterRequest,
  IStudentFilterRequest,
  studentSearchableFields,
} from './achievements.constant';

const myAchievementsIntoDB = async (
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

const earnBadgesIntoDB = async (
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
      author: {
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

const availableBadgesIntoDB = async (options: IPaginationOptions) => {
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

export const ReportsService = {
  myAchievementsIntoDB,
  earnBadgesIntoDB,
  availableBadgesIntoDB
};
