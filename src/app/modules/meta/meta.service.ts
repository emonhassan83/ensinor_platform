import { UserRole } from '@prisma/client';
import { startOfYear, endOfYear } from 'date-fns';
import prisma from '../../utils/prisma';

const superAdminMetaData = async (
  user: any,
  query: Record<string, unknown>,
) => {
  const { earning_year, user_year } = query;
  
  if (user?.role !== UserRole.super_admin) {
    throw new Error('Invalid user role!');
  }

  const totalStudentCount = await prisma.user.count({
    where: {
      role: UserRole.student,
      isDeleted: false,
    },
  });

  const totalInstructorCount = await prisma.user.count({
    where: {
      role: UserRole.instructor,
      isDeleted: false,
    },
  });

  const totalCompanyCount = await prisma.user.count({
    where: {
      role: UserRole.instructor,
      isDeleted: false,
    },
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

  // // **Fetch charts**
  // const earningOverview = await getEarningOverview(selectedEarningYear);
  // const userOverview = await getUserOverview(selectedUserYear);

  return {
    totalStudentCount,
    totalInstructorCount,
    totalCompanyCount,
    totalRevenue: revenue,
    // earningOverview,
    // userOverview,
  };
};

// const getEarningOverview = async (year: number) => {
//   const now = new Date();
//   const currentYear = now.getFullYear();
//   const isCurrentYear = year === currentYear;

//   const yearStart = startOfYear(new Date(year, 0, 1));
//   const yearEnd = endOfYear(new Date(year, 11, 31));

//   const monthlyRevenue = await Payment.aggregate([
//     {
//       $match: {
//         createdAt: { $gte: yearStart, $lte: yearEnd },
//         status: 'paid',
//         isPaid: true,
//       },
//     },
//     {
//       $group: {
//         _id: { $month: '$createdAt' },
//         amount: { $sum: '$amount' },
//       },
//     },
//     {
//       $sort: { _id: 1 },
//     },
//   ]);

//   const months = [
//     'January',
//     'February',
//     'March',
//     'April',
//     'May',
//     'June',
//     'July',
//     'August',
//     'September',
//     'October',
//     'November',
//     'December',
//   ];

//   // If the requested year is the current year, limit to the current month
//   const filteredMonths = isCurrentYear
//     ? months.slice(0, now.getMonth() + 1)
//     : months;

//   const barChartData = filteredMonths.map((month, index) => {
//     const data = monthlyRevenue.find((m: any) => m._id === index + 1);
//     return { month, amount: data ? Math.round(data.amount) : 0 };
//   });

//   return barChartData;
// };

// const getUserOverview = async (year: number) => {
//   const now = new Date();
//   const currentYear = now.getFullYear();
//   const isCurrentYear = year === currentYear;

//   const yearStart = startOfYear(new Date(year, 0, 1));
//   const yearEnd = endOfYear(new Date(year, 11, 31));

//   // Aggregate Monthly User Registrations
//   const monthlyUsers = await User.aggregate([
//     {
//       $match: {
//         createdAt: { $gte: yearStart, $lte: yearEnd },
//       },
//     },
//     {
//       $group: {
//         _id: { $month: '$createdAt' },
//         count: { $sum: 1 },
//       },
//     },
//     { $sort: { _id: 1 } },
//   ]);

//   const months = [
//     'January',
//     'February',
//     'March',
//     'April',
//     'May',
//     'June',
//     'July',
//     'August',
//     'September',
//     'October',
//     'November',
//     'December',
//   ];

//   const filteredMonths = isCurrentYear
//     ? months.slice(0, now.getMonth() + 1)
//     : months;

//   const userOverview = filteredMonths.map((month, index) => {
//     const data = monthlyUsers.find((m: any) => m._id === index + 1);
//     return { month, count: data ? data.count : 0 };
//   });

//   return userOverview;
// };

export const MetaService = {
  superAdminMetaData,
};
