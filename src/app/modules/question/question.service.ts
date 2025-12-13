import { Prisma, Question, QuestionType } from '@prisma/client';
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
import httpStatus from 'http-status';

const insertIntoDB = async (payload: IQuestion) => {
  const {
    quizId,
    name,
    type,
    point,
    expectedAnswer = [],
    feedback,
    options = [],
  } = payload;

  /* ------------------------------------------------
     1️⃣ Validate Quiz
  ------------------------------------------------ */
  const quiz = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      isDeleted: false,
    },
  });

  if (!quiz) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz not found!');
  }

  /* ------------------------------------------------
     2️⃣ Question Type Rules
  ------------------------------------------------ */
  const optionBasedTypes: QuestionType[] = [
    QuestionType.single_choice,
    QuestionType.multiple_choice,
    QuestionType.true_false,
  ];

  if (optionBasedTypes.includes(type)) {
    if (!options || options.length < 2) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'At least two options are required for this question type!',
      );
    }

    const correctCount = options.filter(opt => opt.isCorrect).length;

    if (correctCount === 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'At least one correct option is required!',
      );
    }

    if (type === QuestionType.single_choice && correctCount !== 1) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Single choice question must have exactly one correct option!',
      );
    }
  }

  if (type === QuestionType.short_answer && expectedAnswer.length === 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Expected answer is required for short answer questions!',
    );
  }

  /* ------------------------------------------------
     3️⃣ Create Question + Options (Atomic)
  ------------------------------------------------ */
  const result = await prisma.$transaction(async tx => {
    const question = await tx.question.create({
      data: {
        quizId,
        name,
        type,
        point,
        expectedAnswer,
        feedback,
        options: optionBasedTypes.includes(type)
          ? {
              create: options.map(opt => ({
                optionLevel: opt.optionLevel,
                optionText: opt.optionText,
                isCorrect: opt.isCorrect,
              })),
            }
          : undefined,
      },
      include: { options: true },
    });

    // Update quiz stats
    await tx.quiz.update({
      where: { id: quizId },
      data: {
        questions: { increment: 1 },
        marks: { increment: point },
      },
    });

    return question;
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Quiz question creation failed!',
    );
  }

  return result;
};

const addOptionsToQuestion = async (payload: {
  questionId: string;
  options: IQuestionOption[];
}) => {
  const { questionId, options } = payload;

  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!question || question.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Question not found!');
  }

  const result = await prisma.options.createMany({
    data: options.map(opt => ({
      questionId,
      optionLevel: opt.optionLevel,
      optionText: opt.optionText,
      isCorrect: opt.isCorrect,
    })),
  });

  if (result.count === 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Quiz question options creation failed!',
    );
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
    include: {
      options: {
        select: {
          id: true,
          optionLevel: true,
          optionText: true,
          isCorrect: true,
        },
      },
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

const getOptionsByQuestionId = async (questionId: string) => {
  const question = await prisma.question.findUnique({
    where: { id: questionId, isDeleted: false },
  });
  if (!question) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Question not found!');
  }

  const result = await prisma.options.findMany({
    where: { questionId },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Question options not found!');
  }

  return result;
};

const getByIdFromDB = async (id: string): Promise<Question | null> => {
  const result = await prisma.question.findUnique({
    where: { id, isDeleted: false },
    include: {
      quiz: true,
      options: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Quiz question not found!');
  }
  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IQuestion>,
): Promise<Question> => {
  const question = await prisma.question.findUnique({
    where: { id, isDeleted: false },
  });
  if (!question) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz question not found!');
  }

  const result = await prisma.question.update({
    where: { id },
    data: {
      quizId: payload.quizId,
      name: payload.name,
      type: payload.type,
      point: payload.point,
      expectedAnswer: payload.expectedAnswer,
      feedback: payload.feedback,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz question not updated!');
  }
  return result;
};

const updateOption = async (
  optionId: string,
  payload: Partial<IQuestionOption>,
) => {
  const option = await prisma.options.findUnique({
    where: { id: optionId },
  });
  if (!option) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Question options not found!');
  }

  const result = await prisma.options.update({
    where: { id: optionId },
    data: {
      optionLevel: payload.optionLevel,
      optionText: payload.optionText,
      isCorrect: payload.isCorrect,
    },
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Quiz question option updated failed!',
    );
  }
  return result;
};

const deleteFromDB = async (id: string): Promise<Question> => {
  const question = await prisma.question.findUniqueOrThrow({
    where: { id, isDeleted: false },
  });
  if (!question) {
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

  // Update quiz (decrement by 1)
  await prisma.quiz.update({
    where: { id: question.quizId },
    data: {
      questions: { decrement: 1 },
      marks: { decrement: question.point },
    },
  });

  return result;
};

const deleteOption = async (optionId: string) => {
  const option = await prisma.options.findUnique({
    where: { id: optionId },
  });
  if (!option) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Question options not found!');
  }

  const result = await prisma.options.delete({
    where: { id: optionId },
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Quiz question option deletion failed!',
    );
  }
  return result;
};

export const QuestionService = {
  insertIntoDB,
  addOptionsToQuestion,
  getAllFromDB,
  getOptionsByQuestionId,
  getByIdFromDB,
  updateIntoDB,
  updateOption,
  deleteFromDB,
  deleteOption,
};
