import {
  UserRole,
  PaymentModelType,
  PaymentType,
  CoursesStatus,
} from '@prisma/client';
import { startOfYear, endOfYear } from 'date-fns';
import prisma from '../../utils/prisma';
import { months } from './meta.utils';

const getEarningOverview = async (year: number) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const isCurrentYear = year === currentYear;

  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 11, 31));

  const filteredMonths = isCurrentYear
    ? months.slice(0, now.getMonth() + 1)
    : months;

  // Helper: map grouped data into chart format
  const mapMonthly = (data: any[]) =>
    filteredMonths.map((month, index) => {
      const row = data.find(m => new Date(m.createdAt).getMonth() === index);
      return {
        month,
        amount: row?._sum.amount ?? 0,
      };
    });

  // 1️⃣ Course Overview
  const courseData = await prisma.payment.groupBy({
    by: ['createdAt'],
    where: {
      type: PaymentType.course,
      createdAt: { gte: yearStart, lte: yearEnd },
      status: 'paid',
      isPaid: true,
      isDeleted: false,
    },
    _sum: { amount: true },
  });

  // 2️⃣ Book Overview
  const bookData = await prisma.payment.groupBy({
    by: ['createdAt'],
    where: {
      type: PaymentType.book,
      createdAt: { gte: yearStart, lte: yearEnd },
      status: 'paid',
      isPaid: true,
      isDeleted: false,
    },
    _sum: { amount: true },
  });

  // 2️⃣ Event Overview
  const eventData = await prisma.payment.groupBy({
    by: ['createdAt'],
    where: {
      type: PaymentType.event,
      createdAt: { gte: yearStart, lte: yearEnd },
      status: 'paid',
      isPaid: true,
      isDeleted: false,
    },
    _sum: { amount: true },
  });

  // 3️⃣ Subscription Overview (based on PaymentModelType.subscription)
  const subscriptionData = await prisma.payment.groupBy({
    by: ['createdAt'],
    where: {
      modelType: PaymentModelType.subscription,
      createdAt: { gte: yearStart, lte: yearEnd },
      status: 'paid',
      isPaid: true,
      isDeleted: false,
    },
    _sum: { amount: true },
  });

  return {
    courseEarningOverview: mapMonthly(courseData),
    bookEarningOverview: mapMonthly(bookData),
    eventEarningOverview: mapMonthly(eventData),
    subscriptionEarningOverview: mapMonthly(subscriptionData),
  };
};

const getMostEnrolledCourses = async () => {
  const courses = await prisma.course.findMany({
    where: {
      isDeleted: false,
      status: CoursesStatus.approved,
    },
    orderBy: {
      enrollments: 'desc', // sort by enrollments
    },
    take: 5, // only top 5
    select: {
      id: true,
      title: true,
      thumbnail: true,
      category: true,
      price: true,
      enrollments: true,
      totalCompleted: true,
      avgRating: true,
      ratingCount: true,
    },
  });

  if (!courses || courses.length === 0) {
    return []; // always return array
  }

  // Calculate completionRate for each course
  return courses.map(course => {
    const completionRate =
      course.enrollments > 0
        ? Math.round((course.totalCompleted / course.enrollments) * 100)
        : 0;

    return {
      ...course,
      completionRate, // add field
    };
  });
};

const superAdminMetaDashboard = async (
  user: any,
  query: Record<string, unknown>,
) => {
  const { earning_year, user_year } = query;

  if (user?.role !== UserRole.super_admin) {
    throw new Error('Invalid user role!');
  }

  const totalStudentCount = await prisma.user.count({
    where: { role: UserRole.student, isDeleted: false },
  });
  const totalInstructorCount = await prisma.user.count({
    where: { role: UserRole.instructor, isDeleted: false },
  });
  const totalCompanyCount = await prisma.user.count({
    where: { role: UserRole.instructor, isDeleted: false },
  });

  // **Total Revenue**
  const totalRevenue = await prisma.payment.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      status: 'paid',
      isPaid: true,
      isDeleted: false,
    },
  });
  const revenue = Math.round(totalRevenue._sum.amount ?? 0);

  // Extract the correct year from the query parameters
  const selectedEarningYear = earning_year
    ? parseInt(earning_year as string, 10) || new Date().getFullYear()
    : new Date().getFullYear();

  const selectedUserYear = user_year
    ? parseInt(user_year as string, 10) || new Date().getFullYear()
    : new Date().getFullYear();

  // Fetch charts
  const earningOverview = await getEarningOverview(selectedEarningYear);
  const mostEnrolledCourses = await getMostEnrolledCourses();

  return {
    totalStudentCount,
    totalInstructorCount,
    totalCompanyCount,
    totalRevenue: revenue,
    earningOverview,
    mostEnrolledCourses,
  };
};

const superAdminRevenueAnalysis = async (
  user: any,
  query: Record<string, unknown>,
) => {
  const { earning_year } = query;
  if (user?.role !== UserRole.super_admin) {
    throw new Error('Invalid user role!');
  }

  // --- Breakdown by Sale Type ---
  const [courseSaleAgg, eventSaleAgg, bookSaleAgg, subscriptionSaleAgg] =
    await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'paid',
          isPaid: true,
          isDeleted: false,
          type: PaymentType.course,
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'paid',
          isPaid: true,
          isDeleted: false,
          type: PaymentType.event,
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'paid',
          isPaid: true,
          isDeleted: false,
          type: PaymentType.book,
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'paid',
          isPaid: true,
          isDeleted: false,
          modelType: PaymentModelType.subscription, // subs
        },
      }),
    ]);

  const courseSale = Math.round(courseSaleAgg._sum.amount ?? 0);
  const eventSale = Math.round(eventSaleAgg._sum.amount ?? 0);
  const bookSale = Math.round(bookSaleAgg._sum.amount ?? 0);
  const subscriptionSale = Math.round(subscriptionSaleAgg._sum.amount ?? 0);

  // --- Selected Year for Chart ---
  const selectedEarningYear = earning_year
    ? parseInt(earning_year as string, 10) || new Date().getFullYear()
    : new Date().getFullYear();

  // --- Monthly Earning Overview ---
  const earningOverview = await getEarningOverview(selectedEarningYear);

  return {
    courseSale,
    eventSale,
    bookSale,
    subscriptionSale,
    earningOverview,
  };
};

export const MetaService = {
  superAdminMetaDashboard,
  superAdminRevenueAnalysis,
};
