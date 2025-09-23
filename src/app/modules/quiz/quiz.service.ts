import { Prisma, Quiz, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IQuiz, IQuizFilterRequest } from './quiz.interface';
import { quizSearchAbleFields } from './quiz.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';

const insertIntoDB = async (payload: IQuiz) => {
  const { courseId, authorId } = payload;

  const author = await prisma.user.findFirst({
    where: {
      id: authorId,
      status: UserStatus.active,
      isDeleted: false,
    },
  });
  if (!author) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Author not found!');
  }

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      isDeleted: false,
    },
  });
  if (!course) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Course not found!');
  }

  const result = await prisma.quiz.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Quiz creation failed!');
  }
  return result;
};

const getAllFromDB = async (
  params: IQuizFilterRequest,
  options: IPaginationOptions,
  filterBy: { authorId?: string; courseId?: string },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.QuizWhereInput[] = [{ isDeleted: false }];
  // Filter either by authorId, instructorId
  if (filterBy.authorId) {
    andConditions.push({ authorId: filterBy.authorId });
  }
  if (filterBy.courseId) {
    andConditions.push({ courseId: filterBy.courseId });
  }

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
    include: {
      course: {
        select: { id: true, title: true },
      },
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

const getByIdFromDB = async (id: string): Promise<Quiz | null> => {
  const result = await prisma.quiz.findUnique({
    where: { id, isDeleted: false },
    include: {
      course: {
        select: { id: true, title: true },
      },
      questionsList: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Quiz not found!');
  }
  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IQuiz>,
): Promise<Quiz> => {
  const quiz = await prisma.quiz.findUnique({
    where: { id, isDeleted: false },
  });
  if (!quiz) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz not found!');
  }

  const result = await prisma.quiz.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<Quiz> => {
  const quiz = await prisma.quiz.findUniqueOrThrow({
    where: { id, isDeleted: false },
  });
  if (!quiz) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz not found!');
  }

  const result = await prisma.quiz.update({
    where: { id },
    data: {
      isDeleted: true,
    },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not deleted!');
  }

  return result;
};

export const QuizService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
