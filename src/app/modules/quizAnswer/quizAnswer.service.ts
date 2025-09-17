import {
  Prisma,
  Quiz,
  QuizAnswer,
  QuizAttempt,
  UserStatus,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IQuizAnswer, IQuizAnswerFilterRequest } from './quizAnswer.interface';
import { quizAnswerSearchAbleFields } from './quizAnswer.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';

const insertIntoDB = async (payload: IQuizAnswer) => {
  const { attemptId, questionId, optionId } = payload;

  // 1. Validate attempt
  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, isDeleted: false, isCompleted: false },
    include: { quiz: true },
  });
  if (!attempt)
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid or completed attempt!');

  // 2. Validate question belongs to quiz
  const question = await prisma.question.findFirst({
    where: { id: questionId, quizId: attempt.quizId, isDeleted: false },
    include: { options: true },
  });
  if (!question)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Invalid question for this quiz!',
    );

  // 3. Validate option belongs to question
  const option = await prisma.options.findFirst({
    where: { id: optionId, questionId: question.id },
  });
  if (!option)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Invalid option for this question!',
    );

  // 4. Save answer
  const result = await prisma.quizAnswer.create({
    data: {
      attemptId,
      questionId,
      optionId,
      isCorrect: option.isCorrect,
    },
  });

  return result;
};

const completeAttemptIntoDB = async (attemptId: string) => {
  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, isDeleted: false },
    include: { quiz: true, quizAnswer: true },
  });
  if (!attempt)
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz attempt not found!');
  if (attempt.isCompleted)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Quiz attempt already completed!',
    );

  const quiz = attempt.quiz;

  // 1. Calculate correct answers
  const totalQuestions = quiz.questions;
  const correctAnswers = attempt.quizAnswer.filter(a => a.isCorrect).length;
  const marksPerQuestion =
    quiz.marks && quiz.questions > 0 ? quiz.marks / quiz.questions : 1;
  const marksObtained = Math.round(correctAnswers * marksPerQuestion);
  const correctRate = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;

  // 2. Fetch grading system (course-specific → default)
  let gradingSystem = await prisma.gradingSystem.findFirst({
    where: { courseId: quiz.courseId, isDeleted: false },
    include: { grades: true },
  });

  if (!gradingSystem) {
    gradingSystem = await prisma.gradingSystem.findFirst({
      where: { isDefault: true, isDeleted: false },
      include: { grades: true },
    });
  }

  // 3. Determine grade
  let grade: string | null = null;
  if (gradingSystem && gradingSystem.grades.length > 0) {
    // Example: each Grade has minPercentage, maxPercentage, letterGrade
    const percent = correctRate * 100;
    const matchedGrade = gradingSystem.grades.find(
      g => percent >= g.minScore && percent <= g.maxScore,
    );
    grade = matchedGrade ? matchedGrade.gradeLabel : null;
  }

  // 4. Update attempt
  const updatedAttempt = await prisma.quizAttempt.update({
    where: { id: attempt.id },
    data: {
      isCompleted: true,
      lastActivity: new Date(),
      marksObtained,
      correctRate,
      grade,
    },
  });

  // 5. Increment quiz attempt counter
  await prisma.quiz.update({
    where: { id: quiz.id },
    data: { totalAttempt: { increment: 1 } },
  });

  return updatedAttempt;
};

const getAllFromDB = async (
  params: IQuizAnswerFilterRequest,
  options: IPaginationOptions,
  filterBy: { attemptId?: string },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.QuizAnswerWhereInput[] = [{}];

  if (filterBy.attemptId) {
    andConditions.push({ attemptId: filterBy.attemptId });
  }

  if (searchTerm) {
    andConditions.push({
      OR: quizAnswerSearchAbleFields.map(field => ({
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
        [key]: { equals: (filterData as any)[key] },
      })),
    });
  }

  const whereConditions: Prisma.QuizAnswerWhereInput = { AND: andConditions };

  const result = await prisma.quizAnswer.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: 'desc' },
    include: {
      question: true,
      option: true,
    },
  });

  const total = await prisma.quizAnswer.count({ where: whereConditions });

  return {
    meta: { page, limit, total },
    data: result,
  };
};

const getByIdFromDB = async (id: string) => {
  const result = await prisma.quizAnswer.findUnique({
    where: { id },
    include: {
      question: true,
      option: true,
      attempt: true,
    },
  });
  if (!result)
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz answer not found!');
  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IQuizAnswer>,
): Promise<QuizAnswer> => {
  const quizAnswer = await prisma.quizAnswer.findUnique({
    where: { id },
  });
  if (!quizAnswer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz answer not found!');
  }

  const result = await prisma.quizAnswer.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz answer not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<QuizAnswer> => {
  const quizAnswer = await prisma.quizAnswer.findUniqueOrThrow({
    where: { id },
  });
  if (!quizAnswer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz answer not found!');
  }

  const result = await prisma.quizAnswer.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz answer not deleted!');
  }

  return result;
};

export const QuizAnswerService = {
  insertIntoDB,
  completeAttemptIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
