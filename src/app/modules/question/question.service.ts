import { Prisma, Question } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  IQuestion,
  IQuestionFilterRequest,
  IQuestionOption,
} from './question.interface';
import { questionSearchAbleFields } from './question.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';

const insertIntoDB = async (payload: IQuestion) => {
  const result = await prisma.question.create({
    data: {
      quizId: payload.quizId,
      name: payload.name,
      options: {
        create: payload.options.map((opt: IQuestionOption) => ({
          optionLevel: opt.optionLevel,
          optionText: opt.optionText,
          isCorrect: opt.isCorrect,
        })),
      },
    },
    include: { options: true },
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Course creation failed!');
  }
  return result;
};

const getAllFromDB = async (
  params: IQuestionFilterRequest,
  options: IPaginationOptions,
  quizId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.QuestionWhereInput[] = [
    { quizId, isDeleted: false },
  ];

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: questionSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.QuestionWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.question.findMany({
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

  const total = await prisma.question.count({
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

const getByIdFromDB = async (id: string): Promise<Question | null> => {
  const result = await prisma.question.findUnique({
    where: { id },
    include: {
      quiz: true,
    },
  });

  if (!result || result?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Quiz question not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IQuestion>,
): Promise<Question> => {
  const question = await prisma.question.findUnique({
    where: { id },
  });
  if (!question || question?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz question not found!');
  }

  const result = await prisma.question.update({
    where: { id },
    data: {
      quizId: payload.quizId,
      name: payload.name,
    },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz question not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<Question> => {
  const question = await prisma.question.findUniqueOrThrow({
    where: { id },
  });
  if (!question || question?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz question not found!');
  }

  const result = await prisma.question.update({
    where: { id },
    data: {
      isDeleted: true,
    },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz question not deleted!');
  }

  return result;
};

export const QuestionService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
