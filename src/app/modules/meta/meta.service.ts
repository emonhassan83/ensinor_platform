import {
  UserRole,
  PaymentModelType,
  PaymentType,
  CoursesStatus,
  PaymentStatus,
  CourseType,
  OrderModelType,
} from '@prisma/client';
import { startOfYear, endOfYear } from 'date-fns';
import prisma from '../../utils/prisma';
import { months } from './meta.utils';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';

type SubscriptionOverviewParams = {
  paymentType: PaymentType;
  year: number;
};

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
      status: PaymentStatus.paid,
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
      status: PaymentStatus.paid,
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
      status: PaymentStatus.paid,
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
      status: PaymentStatus.paid,
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
      type: CourseType.external,
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
      instructor: {
        select: {
          name: true,
        },
      },
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

const getMostInstructorEnrolledCourses = async (instructorId: string) => {
  const courses = await prisma.course.findMany({
    where: {
      authorId: instructorId,
      isDeleted: false,
      status: CoursesStatus.approved,
      type: CourseType.external,
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
      instructor: {
        select: {
          name: true,
        },
      },
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

const getRevenueBreakdown = async () => {
  const [courseSaleAgg, eventSaleAgg, bookSaleAgg, subscriptionSaleAgg] =
    await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: PaymentStatus.paid,
          isPaid: true,
          isDeleted: false,
          type: PaymentType.course,
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: PaymentStatus.paid,
          isPaid: true,
          isDeleted: false,
          type: PaymentType.event,
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: PaymentStatus.paid,
          isPaid: true,
          isDeleted: false,
          type: PaymentType.book,
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: PaymentStatus.paid,
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

  return {
    courseSale,
    eventSale,
    bookSale,
    subscriptionSale,
  };
};

const getEnrolledTrends = async (year: number) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const isCurrentYear = year === currentYear;

  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 11, 31));

  const filteredMonths = isCurrentYear
    ? months.slice(0, now.getMonth() + 1)
    : months;

  // 🔹 Fetch enrollment data grouped by month & type
  const grouped = await prisma.enrolledCourse.groupBy({
    by: ['type'],
    _count: { id: true },
    where: {
      createdAt: { gte: yearStart, lte: yearEnd },
      isDeleted: false,
    },
  });

  // 🔹 Get detailed per month data with join for Course Price
  const enrolledCourses = await prisma.enrolledCourse.findMany({
    where: {
      createdAt: { gte: yearStart, lte: yearEnd },
      isDeleted: false,
    },
    select: {
      type: true,
      createdAt: true,
      course: {
        select: { price: true },
      },
    },
  });

  // Helper to map data into chart-friendly format
  const buildTrend = (type: 'platform' | 'business') =>
    filteredMonths.map((month, index) => {
      const monthData = enrolledCourses.filter(
        e => e.type === type && new Date(e.createdAt).getMonth() === index,
      );

      const enrolled = monthData.length;
      const enrolledAmount = monthData.reduce(
        (sum, e) => sum + (e.course?.price ?? 0),
        0,
      );

      return {
        month,
        enrolled,
        enrolledAmount,
      };
    });

  return {
    platform: buildTrend('platform'),
    business: buildTrend('business'),
  };
};

// 1️⃣ Course Category Analysis
const getCourseCategory = async (year: number) => {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 11, 31));

  // Fetch enrolled courses for the year
  const enrolledCourses = await prisma.enrolledCourse.findMany({
    where: {
      createdAt: { gte: yearStart, lte: yearEnd },
      isDeleted: false,
    },
    select: {
      courseCategory: true,
      id: true,
    },
  });

  const totalEnrollments = enrolledCourses.length;
  if (totalEnrollments === 0) return {};

  // Group by category and calculate percentages
  const categoryCount: Record<string, number> = {};
  enrolledCourses.forEach(ec => {
    categoryCount[ec.courseCategory] =
      (categoryCount[ec.courseCategory] || 0) + 1;
  });

  const categoryPercentage: Record<string, number> = {};
  Object.entries(categoryCount).forEach(([category, count]) => {
    categoryPercentage[category] = Math.round((count / totalEnrollments) * 100);
  });

  return categoryPercentage;
};

// 2️⃣ Content Growth Analysis (monthly count based on Order.modelType)
const getContentGrowth = async (year: number) => {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 11, 31));

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: yearStart, lte: yearEnd },
      isDeleted: false,
    },
    select: {
      createdAt: true,
      modelType: true,
    },
  });

  // Initialize result structure
  const growth: Record<string, { month: string; count: number }[]> = {
    course: [],
    book: [],
    event: [],
  };

  for (let i = 0; i < 12; i++) {
    const monthOrders = orders.filter(o => o.createdAt.getMonth() === i);

    growth.course.push({
      month: months[i].slice(0, 3),
      count: monthOrders.filter(o => o.modelType === OrderModelType.course)
        .length,
    });

    growth.book.push({
      month: months[i].slice(0, 3),
      count: monthOrders.filter(o => o.modelType === OrderModelType.book)
        .length,
    });

    growth.event.push({
      month: months[i].slice(0, 3),
      count: monthOrders.filter(o => o.modelType === OrderModelType.event)
        .length,
    });
  }

  return growth;
};

const getUserOverviewByRole = async (role: UserRole, year: number) => {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 11, 31));

  // Fetch users of the given role for the selected year
  const users = await prisma.user.findMany({
    where: {
      role,
      createdAt: { gte: yearStart, lte: yearEnd },
      isDeleted: false,
    },
    select: { createdAt: true },
  });

  // Map counts per month
  return months.map((month, index) => {
    const count = users.filter(u => u.createdAt.getMonth() === index).length;

    return {
      month: month.slice(0, 3),
      count,
    };
  });
};

const getSubscriptionOverview = async ({
  paymentType,
  year,
}: SubscriptionOverviewParams) => {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 11, 31));

  const payments = await prisma.payment.findMany({
    where: {
      type: paymentType,
      createdAt: { gte: yearStart, lte: yearEnd },
      status: 'paid',
      isPaid: true,
      isDeleted: false,
    },
    select: { amount: true, createdAt: true },
  });

  return months.map((month, index) => {
    const monthAmount = payments
      .filter(p => p.createdAt.getMonth() === index)
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      month: month.slice(0, 3),
      amount: Math.round(monthAmount),
    };
  });
};

const getInstructorEarningOverview = async (authorId: string, year: number) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const isCurrentYear = year === currentYear;

  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 11, 31));

  // only include months until current month for the active year
  const filteredMonths = isCurrentYear
    ? months.slice(0, now.getMonth() + 1)
    : months;

  // Query instructor earnings grouped by month
  const earnings = await prisma.payment.groupBy({
    by: ['createdAt'],
    where: {
      authorId,
      createdAt: { gte: yearStart, lte: yearEnd },
      status: 'paid',
      isPaid: true,
      isDeleted: false,
    },
    _sum: { instructorEarning: true },
  });

  // Map data into chart-friendly format
  const earningOverview = filteredMonths.map((month, index) => {
    const row = earnings.find(e => new Date(e.createdAt).getMonth() === index);
    return {
      month,
      amount: row?._sum.instructorEarning ?? 0,
    };
  });

  return earningOverview;
};

const superAdminMetaDashboard = async (
  user: any,
  query: Record<string, unknown>,
) => {
  const { earning_year, user_year } = query;

  if (user?.role !== UserRole.super_admin) {
    throw new ApiError(httpStatus.CONFLICT, 'Invalid user role!');
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
      status: PaymentStatus.paid,
      isPaid: true,
      isDeleted: false,
    },
  });
  const revenue = Math.round(totalRevenue._sum.amount ?? 0);

  // Extract the correct year from the query parameters
  const selectedEarningYear = earning_year
    ? parseInt(earning_year as string, 10) || new Date().getFullYear()
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
    throw new ApiError(httpStatus.CONFLICT, 'Invalid user role!');
  }

  // --- Total Revenue ---
  const totalRevenueAgg = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: {
      status: 'paid',
      isPaid: true,
      isDeleted: false,
    },
  });
  const totalRevenue = Math.round(totalRevenueAgg._sum.amount ?? 0);

  // --- Breakdown (reusable)
  const salesBreakdown = await getRevenueBreakdown();

  // --- Selected Year for Chart ---
  const selectedEarningYear = earning_year
    ? parseInt(earning_year as string, 10) || new Date().getFullYear()
    : new Date().getFullYear();

  // --- Monthly Earning Overview ---
  const earningOverview = await getEarningOverview(selectedEarningYear);

  // --- Earning Chart (percentage) ---
  let earningChart = {
    course: 0,
    event: 0,
    book: 0,
    subscription: 0,
  };

  if (totalRevenue > 0) {
    earningChart = {
      course: Number(
        ((salesBreakdown.courseSale / totalRevenue) * 100).toFixed(2),
      ),
      event: Number(
        ((salesBreakdown.eventSale / totalRevenue) * 100).toFixed(2),
      ),
      book: Number(((salesBreakdown.bookSale / totalRevenue) * 100).toFixed(2)),
      subscription: Number(
        ((salesBreakdown.subscriptionSale / totalRevenue) * 100).toFixed(2),
      ),
    };
  }

  return {
    salesBreakdown,
    earningOverview,
    earningChart,
  };
};

const superAdminEnrollmentAnalysis = async (
  user: any,
  query: Record<string, unknown>,
) => {
  const { earning_year } = query;
  if (user?.role !== UserRole.super_admin) {
    throw new ApiError(httpStatus.CONFLICT, 'Invalid user role!');
  }

  // --- Breakdown (reusable)
  const salesBreakdown = await getRevenueBreakdown();

  // --- Selected Year for Chart ---
  const selectedEarningYear = earning_year
    ? parseInt(earning_year as string, 10) || new Date().getFullYear()
    : new Date().getFullYear();

  // --- Monthly Earning Overview ---
  const enrolledTrends = await getEnrolledTrends(selectedEarningYear);

  return {
    salesBreakdown,
    enrolledTrends,
  };
};

const superAdminContentAnalysis = async (
  user: any,
  query: Record<string, unknown>,
) => {
  const { earning_year } = query;
  if (user?.role !== UserRole.super_admin) {
    throw new ApiError(httpStatus.CONFLICT, 'Invalid user role!');
  }

  // --- Breakdown (reusable)
  const salesBreakdown = await getRevenueBreakdown();

  // --- Selected Year for Chart ---
  const selectedEarningYear = earning_year
    ? parseInt(earning_year as string, 10) || new Date().getFullYear()
    : new Date().getFullYear();

  // --- Monthly Content Growth Overview ---
  const courseCategory = await getCourseCategory(selectedEarningYear);

  // --- Monthly Content Growth Overview ---
  const contentGrowth = await getContentGrowth(selectedEarningYear);

  return {
    salesBreakdown,
    courseCategory,
    contentGrowth,
  };
};

const superAdminUserAnalysis = async (
  user: any,
  query: Record<string, unknown>,
) => {
  const { earning_year } = query;
  if (user?.role !== UserRole.super_admin) {
    throw new ApiError(httpStatus.CONFLICT, 'Invalid user role!');
  }

  // --- Breakdown (reusable)
  const salesBreakdown = await getRevenueBreakdown();

  // --- Selected Year for Chart ---
  const selectedYear = earning_year
    ? parseInt(earning_year as string, 10) || new Date().getFullYear()
    : new Date().getFullYear();

  // --- Monthly User  Overview ---
  const studentOverview = await getUserOverviewByRole(
    UserRole.student,
    selectedYear,
  );
  const instructorOverview = await getUserOverviewByRole(
    UserRole.instructor,
    selectedYear,
  );
  const businessOverview = await getUserOverviewByRole(
    UserRole.company_admin,
    selectedYear,
  );

  return {
    salesBreakdown,
    studentOverview,
    instructorOverview,
    businessOverview,
  };
};

const superAdminSubscriptionAnalysis = async (
  user: any,
  query: Record<string, unknown>,
) => {
  const { earning_year } = query;
  if (user?.role !== UserRole.super_admin) {
    throw new ApiError(httpStatus.CONFLICT, 'Invalid user role!');
  }

  // --- Breakdown (reusable)
  const salesBreakdown = await getRevenueBreakdown();

  const selectedYear = earning_year
    ? parseInt(earning_year as string, 10) || new Date().getFullYear()
    : new Date().getFullYear();

  const instructorSubscription = await getSubscriptionOverview({
    paymentType: PaymentType.instructor_subscription,
    year: selectedYear,
  });

  const businessSubscription = await getSubscriptionOverview({
    paymentType: PaymentType.company_subscription,
    year: selectedYear,
  });

  return {
    salesBreakdown,
    instructorSubscription,
    businessSubscription,
  };
};

const companyAdminMetaData = async (user: any) => {
  if (user?.role !== UserRole.company_admin) {
    throw new ApiError(httpStatus.CONFLICT, 'Invalid user role!');
  }

  const company = await prisma.company.findFirst({
    where: { userId: user.id, isDeleted: false },
  });
  if (!company) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Company not found !');
  }

  const totalCourseCount = await prisma.course.count({
    where: {
      companyId: company.id,
      status: CoursesStatus.approved,
      isDeleted: false,
    },
  });
  const enrolledCoursesCount = await prisma.enrolledCourse.count({
    where: {
      course: {
        companyId: company.id,
        status: CoursesStatus.approved,
      },
      isDeleted: false,
    },
  });

  // --- Revenue ---
  const totalRevenue = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: {
      status: PaymentStatus.paid,
      isPaid: true,
      isDeleted: false,
      authorId: company.id,
    },
  });
  const revenue = Math.round(totalRevenue._sum.amount ?? 0);

  // --- Dates ---
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // --- Upcoming events ---
  const upcomingEvents = await prisma.event.findMany({
    where: {
      companyId: company.id,
      isDeleted: false,
      date: { gte: today.toISOString() }, // date string compare
    },
    orderBy: { date: 'asc' },
    take: 10,
    select: {
      id: true,
      title: true,
      type: true,
      date: true,
      startTime: true,
      endTime: true,
    },
  });

  const totalUpcomingEventCount = await prisma.event.count({
    where: {
      companyId: company.id,
      isDeleted: false,
      date: { gte: today.toISOString() },
    },
  });

  // --- Recent course activity (completed this month) ---
  const recentCourseActivity = await prisma.enrolledCourse.findMany({
    where: {
      isComplete: true,
      isDeleted: false,
      updatedAt: { gte: startOfMonth },
      course: { companyId: company.id },
    },
    orderBy: { updatedAt: 'desc' },
    take: 10,
    select: {
      updatedAt: true,
      author: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true } },
    },
  });

  const thisMonthCompletedCount = await prisma.enrolledCourse.count({
    where: {
      isComplete: true,
      isDeleted: false,
      updatedAt: { gte: startOfMonth },
      course: { companyId: company.id },
    },
  });

  return {
    totalCourseCount,
    enrolledCoursesCount,
    totalRevenue: revenue,
    totalUpcomingEventCount,
    thisMonthCompletedCount,
    recentCourseActivity: recentCourseActivity.map(a => ({
      courseName: a.course.title,
      studentName: a.author.name,
      completedAt: a.updatedAt,
    })),
    upcomingEvents: upcomingEvents.map(e => ({
      title: e.title,
      type: e.type,
      date: e.date,
      time: `${e.startTime} - ${e.endTime}`,
    })),
  };
};

const businessInstructorMetaData = async (user: any) => {
  if (user?.role !== UserRole.business_instructors) {
    throw new ApiError(httpStatus.CONFLICT, 'Invalid user role!');
  }

  const company = await prisma.company.findFirst({
    where: { userId: user.id, isDeleted: false },
  });
  if (!company) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Company not found !');
  }

  const totalCourseCount = await prisma.course.count({
    where: {
      authorId: user?.userId,
      companyId: company.id,
      status: CoursesStatus.approved,
      isDeleted: false,
    },
  });

  const enrolledCoursesCount = await prisma.enrolledCourse.count({
    where: {
      course: {
        authorId: user?.userId,
        companyId: company.id,
        status: CoursesStatus.approved,
      },
      isDeleted: false,
    },
  });

  // --- Revenue ---
  const totalRevenue = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: {
      status: PaymentStatus.paid,
      isPaid: true,
      isDeleted: false,
      authorId: user.id,
      companyId: company.id,
    },
  });
  const revenue = Math.round(totalRevenue._sum.amount ?? 0);

  // --- Dates ---
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // --- Upcoming events ---
  const upcomingEvents = await prisma.event.findMany({
    where: {
      companyId: company.id,
      authorId: user.userId,
      isDeleted: false,
      date: { gte: today.toISOString() }, // date string compare
    },
    orderBy: { date: 'asc' },
    take: 10,
    select: {
      id: true,
      title: true,
      type: true,
      date: true,
      startTime: true,
      endTime: true,
    },
  });

  const totalUpcomingEventCount = await prisma.event.count({
    where: {
      companyId: company.id,
      authorId: user.userId,
      isDeleted: false,
      date: { gte: today.toISOString() },
    },
  });

  // --- Recent course activity (completed this month) ---
  const recentCourseActivity = await prisma.enrolledCourse.findMany({
    where: {
      isComplete: true,
      isDeleted: false,
      updatedAt: { gte: startOfMonth },
      course: { companyId: company.id },
      authorId: user.userId,
    },
    orderBy: { updatedAt: 'desc' },
    take: 10,
    select: {
      updatedAt: true,
      author: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true } },
    },
  });

  const thisMonthCompletedCount = await prisma.enrolledCourse.count({
    where: {
      isComplete: true,
      isDeleted: false,
      updatedAt: { gte: startOfMonth },
      course: { companyId: company.id },
      authorId: user.userId,
    },
  });

  return {
    totalCourseCount,
    enrolledCoursesCount,
    totalRevenue: revenue,
    totalUpcomingEventCount,
    thisMonthCompletedCount,
    recentCourseActivity: recentCourseActivity.map(a => ({
      courseName: a.course.title,
      studentName: a.author.name,
      completedAt: a.updatedAt,
    })),
    upcomingEvents: upcomingEvents.map(e => ({
      title: e.title,
      type: e.type,
      date: e.date,
      time: `${e.startTime} - ${e.endTime}`,
    })),
  };
};

const employeeMetaData = async (user: any) => {
  if (user?.role !== UserRole.employee) {
    throw new ApiError(httpStatus.CONFLICT, 'Invalid user role!');
  }

  // fetch enrolled courses for this user
  const enrolledCourses = await prisma.enrolledCourse.findMany({
    where: { userId: user?.userId, isDeleted: false },
    select: {
      completedRate: true,
      learningTime: true,
      isComplete: true,
      course: {
        select: { id: true, title: true, category: true },
      },
    },
  });

  // total learned hours (minutes → hours)
  const totalLearnedHours = Math.round(
    enrolledCourses.reduce((sum, ec) => sum + ec.learningTime, 0) / 60,
  );

  // completed courses
  const completedCourses = enrolledCourses
    .filter(ec => ec.isComplete)
    .map(ec => ({
      id: ec.course.id,
      name: ec.course.title,
      category: ec.course.category,
      completionRate: ec.completedRate,
    }));

  const totalCompletedCourseCount = completedCourses.length;

  // in-progress courses
  const inProgressCourses = enrolledCourses
    .filter(ec => !ec.isComplete)
    .map(ec => ({
      id: ec.course.id,
      name: ec.course.title,
      category: ec.course.category,
      completionRate: ec.completedRate,
    }));

  const totalInProgressCourseCount = inProgressCourses.length;

  return {
    totalCompletedCourseCount,
    totalInProgressCourseCount,
    totalLearnedHours,
    completedCourses,
    inProgressCourses,
  };
};

const instructorMetaData = async (
  user: any,
  query: Record<string, unknown>,
) => {
  if (user?.role !== UserRole.instructor) {
    throw new ApiError(httpStatus.CONFLICT, 'Invalid user role!');
  }
  const { year } = query;

  const totalCourseCount = await prisma.course.count({
    where: {
      authorId: user?.userId,
      status: CoursesStatus.approved,
      isDeleted: false,
    },
  });

  const enrolledCoursesCount = await prisma.enrolledCourse.count({
    where: {
      course: {
        authorId: user?.userId,
        status: CoursesStatus.approved,
      },
      isDeleted: false,
    },
  });

  // --- Revenue ---
  const totalRevenue = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: {
      status: PaymentStatus.paid,
      isPaid: true,
      isDeleted: false,
      authorId: user.id,
    },
  });
  const revenue = Math.round(totalRevenue._sum.amount ?? 0);

  // --- Selected Year for Chart ---
  const selectedEarningYear = year
    ? parseInt(year as string, 10) || new Date().getFullYear()
    : new Date().getFullYear();

  // --- Monthly Content Growth Overview ---
  const earningOverview = await getInstructorEarningOverview(
    user.userId,
    selectedEarningYear,
  );
  const mostEnrolledCourses = await getMostInstructorEnrolledCourses(
    user.userId,
  );

  return {
    totalCourseCount,
    enrolledCoursesCount,
    totalRevenue: revenue,
    earningOverview,
    mostEnrolledCourses,
  };
};

const coInstructorMetaData = async (
  user: any,
  query: Record<string, unknown>,
) => {
  if (
    user?.role !== UserRole.instructor ||
    user.role !== UserRole.business_instructors
  ) {
    throw new ApiError(httpStatus.CONFLICT, 'Invalid user role!');
  }
  const { year } = query;

  const totalCourseCount = await prisma.course.count({
    where: {
      authorId: user?.userId,
      status: CoursesStatus.approved,
      isDeleted: false,
    },
  });

  // --- Revenue ---
  const totalRevenue = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: {
      status: PaymentStatus.paid,
      isPaid: true,
      isDeleted: false,
      authorId: user.id,
    },
  });
  const revenue = Math.round(totalRevenue._sum.amount ?? 0);

  // --- Selected Year for Chart ---
  const selectedEarningYear = year
    ? parseInt(year as string, 10) || new Date().getFullYear()
    : new Date().getFullYear();

  // --- Monthly Content Growth Overview ---
  const earningOverview = await getInstructorEarningOverview(
    user.userId,
    selectedEarningYear,
  );

    const mostEnrolledCourses = await getMostInstructorEnrolledCourses(
    user.userId,
  );

  return {
    totalCourseCount,
    totalRevenue: revenue,
    earningOverview,
    mostEnrolledCourses
  };
};

const studentMetaData = async (user: any) => {
  if (user?.role !== UserRole.student) {
    throw new ApiError(httpStatus.CONFLICT, 'Invalid user role!');
  }

  // fetch enrolled courses for this user
  const enrolledCourses = await prisma.enrolledCourse.findMany({
    where: { userId: user?.userId, isDeleted: false },
    select: {
      completedRate: true,
      learningTime: true,
      isComplete: true,
      course: {
        select: { id: true, title: true, category: true },
      },
    },
  });

  // total learned hours (minutes → hours)
  const totalLearnedHours = Math.round(
    enrolledCourses.reduce((sum, ec) => sum + ec.learningTime, 0) / 60,
  );

  // completed courses
  const completedCourses = enrolledCourses
    .filter(ec => ec.isComplete)
    .map(ec => ({
      id: ec.course.id,
      name: ec.course.title,
      category: ec.course.category,
      completionRate: ec.completedRate,
    }));

  const totalCompletedCourseCount = completedCourses.length;

  // in-progress courses
  const inProgressCourses = enrolledCourses
    .filter(ec => !ec.isComplete)
    .map(ec => ({
      id: ec.course.id,
      name: ec.course.title,
      category: ec.course.category,
      completionRate: ec.completedRate,
    }));

  const totalInProgressCourseCount = inProgressCourses.length;

  return {
    totalCompletedCourseCount,
    totalInProgressCourseCount,
    totalLearnedHours,
    completedCourses,
    inProgressCourses,
  };
};

export const MetaService = {
  superAdminMetaDashboard,
  superAdminRevenueAnalysis,
  superAdminEnrollmentAnalysis,
  superAdminContentAnalysis,
  superAdminUserAnalysis,
  superAdminSubscriptionAnalysis,
  companyAdminMetaData,
  businessInstructorMetaData,
  employeeMetaData,
  instructorMetaData,
  coInstructorMetaData,
  studentMetaData,
};
