import { Prisma, Quiz, QuizAttempt } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IQuizAttempt, IQuizAttemptFilterRequest } from './quizAttempt.interface';
import { quizAttemptSearchAbleFields } from './quizAttempt.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';

const insertIntoDB = async (payload: IQuizAttempt) => {
  const { quizId, userId } = payload;

  const quiz = await prisma.quiz.findFirst({
    where: {
      id: quizId
    }
  })
  if (!quiz || quiz?.isDeleted) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Quiz not found!');
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId
    }
  })
  if (!user || user?.isDeleted) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Quiz attempt user not found!');
  }

  const result = await prisma.quizAttempt.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Quiz attempt creation failed!');
  }
  return result;
};

const getAllFromDB = async (
  params: IQuizAttemptFilterRequest,
  options: IPaginationOptions,
  quizId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.QuizAttemptWhereInput[] = [
    { quizId, isDeleted: false },
  ];

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
        user: true,
        quiz: true
      }
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
    where: { id },
    include: {
      user: true,
        quiz: true
    },
  });

  if (!result || result?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Quiz Attempt not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IQuizAttempt>,
): Promise<QuizAttempt> => {
  const quiz = await prisma.quizAttempt.findUnique({
    where: { id },
  });
  if (!quiz || quiz?.isDeleted) {
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
    where: { id },
  });
  if (!quiz || quiz?.isDeleted) {
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

  return result;
};

export const QuizAttemptService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
