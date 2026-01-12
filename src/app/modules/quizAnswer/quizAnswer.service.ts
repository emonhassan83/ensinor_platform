import { CourseGrade, Prisma, QuizAnswer } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IQuizAnswer, IQuizAnswerFilterRequest } from './quizAnswer.interface';
import { quizAnswerSearchAbleFields } from './quizAnswer.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';
import { isShortAnswerCorrect } from '../../utils/answerAnalyzer';

const insertIntoDB = async (payload: IQuizAnswer) => {
  const { attemptId, questionId, optionId, shortAnswer } = payload;

  // 1. Validate attempt
  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, isDeleted: false },
    include: { quiz: true },
  });
  if (!attempt)
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid or completed attempt!");

  // 2. Validate question
  const question = await prisma.question.findFirst({
    where: { id: questionId, quizId: attempt.quizId, isDeleted: false },
    include: { options: true },
  });
  if (!question)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invalid question for this quiz!"
    );

  let isCorrect = false;

  // Handle SHORT ANSWER logic
  if (question.type === "short_answer") {
    if (!shortAnswer)
      throw new ApiError(httpStatus.BAD_REQUEST, "Short answer required");

    isCorrect = isShortAnswerCorrect(shortAnswer, question.expectedAnswer);

    // Save short-answer result (no optionId required)
    const result = await prisma.quizAnswer.create({
      data: {
        attemptId,
        questionId,
        shortAnswer,
        // optionId: optionId ?? null, // optional
        isCorrect,
      },
    });

    return result;
  }

  // For other question types → optionId must exist
  if (!optionId)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Option is required for this question type"
    );

  // 3. Validate option
  const option = await prisma.options.findFirst({
    where: { id: optionId, questionId: question.id },
  });
  if (!option)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invalid option for this question!"
    );

  // 4. Check if already answered
  const existing = await prisma.quizAnswer.findFirst({
    where: { attemptId, questionId },
  });

  if (existing) {
    return existing; // return existing answer
  }

  // 5. Save for MCQ / True/False
  const result = await prisma.quizAnswer.create({
    data: {
      attemptId,
      questionId,
      optionId,
      isCorrect: option.isCorrect,
    },
  });

  if (!result)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Quiz question answer save failed!"
    );

  return result;
};

const completeAttemptIntoDB = async (
  attemptId: string,
  payload: { timeTaken: number },
) => {
  try {
    return await prisma.$transaction(async tx => {
      // 1. Fetch attempt with relations
      const attempt = await tx.quizAttempt.findFirst({
        where: { id: attemptId, isDeleted: false },
        include: { quizAnswer: true, quiz: true },
      });

      if (!attempt) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Quiz attempt not found!');
      }

      const quiz = attempt.quiz;

      // 2. Count total questions
      const totalQuestions = await tx.question.count({
        where: { quizId: quiz.id, isDeleted: false },
      });

      // 3. Count correct answers
      const correctAnswers = attempt.quizAnswer.filter(a => a.isCorrect)
        .length;

      // 4. Calculate marks & percent
      const marksPerQuestion =
        quiz.marks && totalQuestions > 0
          ? quiz.marks / totalQuestions
          : 1;

      const marksObtained = Math.round(correctAnswers * marksPerQuestion);
      const correctRate =
        totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
      const percent = correctRate * 100;

      // 5. Passing score check FIRST
      if (percent < quiz.passingScore) {
        // Auto fail — no grading calculation required
        const updatedFailAttempt = await tx.quizAttempt.update({
          where: { id: attempt.id },
          data: {
            isCompleted: true,
            lastAttempt: new Date(),
            marksObtained,
            correctRate,
            grade: CourseGrade.FAIL,
            timeTaken: payload.timeTaken,
          },
        });

        // increment quiz attempts
        await tx.quiz.update({
          where: { id: quiz.id },
          data: { totalAttempt: { increment: 1 } },
        });

        return updatedFailAttempt;
      }

      // Otherwise user passed the quiz — continue grading
      let grade: CourseGrade = CourseGrade.PASS; // default for success
      let status: 'pass' | 'fail' = 'pass';

      // 6. Fetch grading system
      let gradingSystem = await tx.gradingSystem.findFirst({
        where: { courseId: quiz.courseId, isDeleted: false },
        include: { grades: true },
      });

      if (!gradingSystem) {
        gradingSystem = await tx.gradingSystem.findFirst({
          where: { isDefault: true, isDeleted: false },
          include: { grades: true },
        });
      }

      // 7. Apply grading if available
      if (gradingSystem && gradingSystem.grades.length > 0) {
        gradingSystem.grades.sort((a, b) => b.minScore - a.minScore);

        const matched = gradingSystem.grades.find(g => {
          return percent >= g.minScore;
        });

        if (matched) {
          grade = matched.gradeLabel as CourseGrade;
        }
      } else {
        // final fallback if no grading rules exist
        grade = CourseGrade.PASS;
      }

      // 8. Update final attempt
      const updatedAttempt = await tx.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          isCompleted: true,
          lastAttempt: new Date(),
          marksObtained,
          correctRate,
          grade,
          timeTaken: payload.timeTaken,
        },
      });

      // 9. Increment quiz attempt count
      await tx.quiz.update({
        where: { id: quiz.id },
        data: { totalAttempt: { increment: 1 } },
      });

      return updatedAttempt;
    });
  } catch (error) {
    console.error('completeAttemptIntoDB error:', error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to complete quiz attempt',
    );
  }
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
  id: string, // quizAnswerId
  payload: { optionId: string },
): Promise<QuizAnswer> => {
  const quizAnswer = await prisma.quizAnswer.findUnique({
    where: { id },
    include: {
      question: true,
    },
  });

  if (!quizAnswer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Quiz answer not found!');
  }

  // Validate new option belongs to the same question
  const option = await prisma.options.findFirst({
    where: {
      id: payload.optionId,
      questionId: quizAnswer.questionId,
    },
  });

  if (!option) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Invalid option for this question!',
    );
  }

  // Update quizAnswer with new optionId + correctness
  const result = await prisma.quizAnswer.update({
    where: { id },
    data: {
      optionId: option.id,
      isCorrect: option.isCorrect,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Quiz answer not updated!');
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
