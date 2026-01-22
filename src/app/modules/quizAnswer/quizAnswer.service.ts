import { CourseGrade, Prisma, QuizAnswer } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IQuizAnswer, IQuizAnswerFilterRequest } from './quizAnswer.interface';
import { quizAnswerSearchAbleFields } from './quizAnswer.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';
import { isShortAnswerCorrect } from '../../utils/answerAnalyzer';
import { checkAndAwardQuizBadges } from './quizAnswer.utils';

const insertIntoDB = async (payload: IQuizAnswer) => {
  const { attemptId, questionId, optionId, shortAnswer } = payload;

  return await prisma.$transaction(async tx => {
    // 1. Validate attempt (incomplete হতে হবে)
    const attempt = await tx.quizAttempt.findFirst({
      where: { id: attemptId, isDeleted: false, isCompleted: false },
      include: { quiz: true },
    });
    if (!attempt) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Invalid, completed, or deleted attempt!',
      );
    }

    // 2. Validate question belongs to this quiz
    const question = await tx.question.findFirst({
      where: { id: questionId, quizId: attempt.quizId, isDeleted: false },
      include: { options: true },
    });
    if (!question) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Invalid question for this quiz!',
      );
    }

    // 3. Check if already answered this question in this attempt
    const existingAnswer = await tx.quizAnswer.findFirst({
      where: { attemptId, questionId },
    });
    if (existingAnswer) {
      return existingAnswer;
    }

    let isCorrect = false;
    let savedAnswer;

    if (question.type === 'short_answer') {
      if (!shortAnswer) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Short answer required!');
      }

      isCorrect = isShortAnswerCorrect(shortAnswer, question.expectedAnswer);

      savedAnswer = await tx.quizAnswer.create({
        data: {
          attemptId,
          questionId,
          shortAnswer,
          isCorrect,
        },
      });
    } else {
      // MCQ / TrueFalse / Multi-select
      if (!optionId) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Option required for this question type!',
        );
      }

      const option = await tx.options.findFirst({
        where: { id: optionId, questionId: question.id },
      });
      if (!option) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid option!');
      }

      isCorrect = option.isCorrect;

      savedAnswer = await tx.quizAnswer.create({
        data: {
          attemptId,
          questionId,
          optionId,
          isCorrect,
        },
      });
    }

    return savedAnswer;
  });
};

const completeAttemptIntoDB = async (
  attemptId: string,
  payload: { timeTaken: number },
) => {
  return await prisma.$transaction(async tx => {
    // 1. Fetch attempt + answers + quiz
    const attempt = await tx.quizAttempt.findUnique({
      where: { id: attemptId, isDeleted: false },
      include: {
        quiz: true,
        quizAnswer: {
          include: { question: true },
        },
      },
    });

    if (!attempt) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Quiz attempt not found!');
    }
    if (attempt.isCompleted) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Already completed!');
    }

    const quiz = attempt.quiz;

    // 2. Total questions (isDeleted false)
    const totalQuestions = await tx.question.count({
      where: { quizId: quiz.id, isDeleted: false },
    });

    // 3. Correct answers count
    const correctAnswers = attempt.quizAnswer.filter(a => a.isCorrect).length;

    // 4. Calculate marks & correctRate
    const marksPerQuestion =
      totalQuestions > 0 ? quiz.marks / totalQuestions : 0;
    const marksObtained = Math.round(correctAnswers * marksPerQuestion);
    const correctRate =
      totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    // 5. Determine if passed
    const isPassed = marksObtained >= quiz.passingScore;

    // 6. Grade calculation
    let grade: CourseGrade = CourseGrade.FAIL;

    if (isPassed) {
      // Grading system
      const gradingSystem =
        (await tx.gradingSystem.findFirst({
          where: { courseId: quiz.courseId, isDeleted: false },
          include: { grades: true },
        })) ||
        (await tx.gradingSystem.findFirst({
          where: { isDefault: true, isDeleted: false },
          include: { grades: true },
        }));

      if (gradingSystem && gradingSystem.grades.length > 0) {
        const sortedGrades = gradingSystem.grades.sort(
          (a, b) => b.minScore - a.minScore,
        );
        const matchedGrade = sortedGrades.find(g => correctRate >= g.minScore);
        if (matchedGrade) {
          grade = matchedGrade.gradeLabel as CourseGrade;
        } else {
          grade = CourseGrade.PASS; // fallback
        }
      } else {
        grade = CourseGrade.PASS; // no system → pass
      }
    }

    // 7. Update attempt
    const updatedAttempt = await tx.quizAttempt.update({
      where: { id: attemptId },
      data: {
        marksObtained,
        totalMarks: quiz.marks,
        correctRate,
        grade,
        timeTaken: payload.timeTaken,
        isPassed,
        isCompleted: true,
        lastAttempt: new Date(),
        attemptNumber: attempt.attemptNumber, // already set
      },
    });

    // 8. Increment quiz totalAttempt
    await tx.quiz.update({
      where: { id: quiz.id },
      data: { totalAttempt: { increment: 1 } },
    });

    // 9. check quiz related badges related work
    if (updatedAttempt.isCompleted && updatedAttempt.userId) {
      const awardedBadges = await checkAndAwardQuizBadges(
        updatedAttempt.userId,
        quiz.id,
        attemptId,
      );

      if (awardedBadges.length > 0) {
        console.log(`Awarded quiz badges: ${awardedBadges.join(', ')}`);
      }
    }

    return updatedAttempt;
  });
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
      question: { include: { options: true } },
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
      question: { include: { options: true } },
      option: true,
      attempt: { include: { quiz: true } },
    },
  });

  if (!result)
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz answer not found!');
  return result;
};

const updateIntoDB = async (
  id: string,
  payload: { optionId?: string; shortAnswer?: string },
) => {
  return await prisma.$transaction(async tx => {
    const answer = await tx.quizAnswer.findUnique({
      where: { id },
      include: { question: true },
    });

    if (!answer)
      throw new ApiError(httpStatus.NOT_FOUND, 'Quiz answer not found!');

    const attempt = await tx.quizAttempt.findFirst({
      where: { id: answer.attemptId, isCompleted: false, isDeleted: false },
    });
    if (!attempt)
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Cannot update completed attempt!',
      );

    let isCorrect = false;

    if (payload.shortAnswer && answer.question.type === 'short_answer') {
      isCorrect = isShortAnswerCorrect(
        payload.shortAnswer,
        answer.question.expectedAnswer,
      );
      return tx.quizAnswer.update({
        where: { id },
        data: { shortAnswer: payload.shortAnswer, isCorrect },
      });
    }

    if (payload.optionId) {
      const option = await tx.options.findFirst({
        where: { id: payload.optionId, questionId: answer.questionId },
      });
      if (!option)
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid option!');

      isCorrect = option.isCorrect;
      return tx.quizAnswer.update({
        where: { id },
        data: { optionId: payload.optionId, isCorrect },
      });
    }

    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'No valid update data provided!',
    );
  });
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
