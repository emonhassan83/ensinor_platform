import { Prisma, QuizAttempt, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  IQuizAttempt,
  IQuizAttemptFilterRequest,
} from './quizAttempt.interface';
import { quizAttemptSearchAbleFields } from './quizAttempt.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';

const insertIntoDB = async (payload: IQuizAttempt) => {
  const { quizId, userId } = payload;
  
  // 1. Validate quiz
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, isDeleted: false },
  });
  if (!quiz) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Quiz not found!');
  }

  // 2. Validate user
  const user = await prisma.user.findFirst({
    where: { id: userId, status: UserStatus.active, isDeleted: false },
  });
  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Quiz attempt user not found!');
  }

  // 3. Check if user already has an attempt for this quiz
  const existingAttempt = await prisma.quizAttempt.findFirst({
    where: { quizId, userId, isDeleted: false },
  });
  if (existingAttempt) {
    // if (existingAttempt.isCompleted) {
    //   throw new ApiError(
    //     httpStatus.BAD_REQUEST,
    //     'Quiz attempt already completed!',
    //   );
    // }
    return existingAttempt;
  }

  const result = await prisma.quizAttempt.create({
    data: {
      ...payload,
      authorId: quiz.authorId,
      totalMarks: quiz.marks ?? undefined,
    },
  });
  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Quiz attempt creation failed!');
  }

  return result;
};

// Ignore this fixed this in quiz answer
const completeAttemptIntoDB = async (attemptId: string) => {
  // 1. Find attempt
  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, isDeleted: false },
  });
  if (!attempt) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz attempt not found!');
  }
  if (attempt.isCompleted) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Quiz attempt already completed!',
    );
  }

  // 2. Update attempt -> mark as completed
  const updated = await prisma.quizAttempt.update({
    where: { id: attempt.id },
    data: {
      isCompleted: true,
      lastAttempt: new Date(),
    },
  });

  // 3. Increment quiz totalAttempt
  await prisma.quiz.update({
    where: { id: attempt.quizId },
    data: {
      totalAttempt: { increment: 1 },
    },
  });

  return updated;
};

const getAllFromDB = async (
  params: IQuizAttemptFilterRequest,
  options: IPaginationOptions,
  filterBy: { userId?: string; quizId?: string; authorId?: string },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.QuizAttemptWhereInput[] = [{ isDeleted: false }];
  // Filter either by authorId or userId
  if (filterBy.authorId) {
    andConditions.push({ authorId: filterBy.authorId });
  }
  if (filterBy.userId) {
    andConditions.push({ userId: filterBy.userId });
  }
  if (filterBy.quizId) {
    andConditions.push({ quizId: filterBy.quizId });
  }

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: quizAttemptSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.QuizAttemptWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.quizAttempt.findMany({
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
        },
      },
      quiz: {
        include: {
          course: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });

  const total = await prisma.quizAttempt.count({
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

const getByIdFromDB = async (id: string): Promise<QuizAttempt | null> => {
  const result = await prisma.quizAttempt.findUnique({
    where: { id, isDeleted: false },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      quiz: {
        include: {
          course: {
            select: {
              title: true,
            },
          },
        },
      },
      quizAnswer: true
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Quiz Attempt not found!');
  }
  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IQuizAttempt>,
): Promise<QuizAttempt> => {
  const quiz = await prisma.quizAttempt.findUnique({
    where: { id, isDeleted: false },
  });
  if (!quiz) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz attempt not found!');
  }

  const result = await prisma.quizAttempt.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz attempt not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<QuizAttempt> => {
  const quiz = await prisma.quizAttempt.findUniqueOrThrow({
    where: { id, isDeleted: false },
  });
  if (!quiz) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz attempt not found!');
  }

  const result = await prisma.quizAttempt.update({
    where: { id },
    data: {
      isDeleted: true,
    },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz attempt not deleted!');
  }

  // here updated total attempt fields
  await prisma.quiz.update({
    where: { id: quiz.id },
    data: {
      totalAttempt: { decrement: 1 },
    },
  });

  return result;
};

export const QuizAttemptService = {
  insertIntoDB,
  completeAttemptIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
