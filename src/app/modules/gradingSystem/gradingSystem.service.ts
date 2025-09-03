import { GradingSystem, Prisma, Question } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  IGradingSystem,
  IGradingSystemFilterRequest,
  IGrade,
} from './gradingSystem.interface';
import { gradingSystemSearchAbleFields } from './gradingSystem.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';

const insertIntoDB = async (payload: IGradingSystem) => {
   const { courseId, authorId } = payload;

  // 1. Validate quiz existence
  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });
  if (!course || course.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found!');
  }

  // 2. Validate user existence
  const author = await prisma.user.findUnique({
    where: { id: authorId },
  });
  if (!author || author.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');
  }

  // 3. Create grading system with options
  const result = await prisma.gradingSystem.create({
    data: payload
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Grading system creation failed!',
    );
  }

  return result;
};

const addGrade = async (payload: IGrade) => {
  const { gradingSystemId } = payload;

  const gradingSystem = await prisma.gradingSystem.findUnique({
    where: { id: gradingSystemId }
  });

  if (!gradingSystem || gradingSystem.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Grading system not found!');
  }

  const result = await prisma.grade.create({
    data: payload
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Grade options creation failed!',
    );
  }
  return result;
};

const getAllFromDB = async (
  params: IGradingSystemFilterRequest,
  options: IPaginationOptions,
  courseId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.GradingSystemWhereInput[] = [
    { courseId, isDeleted: false },
  ];

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: gradingSystemSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.GradingSystemWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.gradingSystem.findMany({
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
    include: { grades: true },
  });

  const total = await prisma.gradingSystem.count({
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

const getGradesByGradingSystemId = async (gradeId: string) => {
  const grade = await prisma.grade.findUnique({
    where: { id: gradeId }
  });

  if (!grade) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Grade not found!');
  }

  const result = await prisma.grade.findMany({
    where: { gradingSystemId: gradeId },
  })
   if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Grade options not found!');
  }

  return result;
};

const getByIdFromDB = async (id: string): Promise<GradingSystem | null> => {
  const result = await prisma.gradingSystem.findUnique({
    where: { id },
    include: {
      grades: true,
    },
  });

  if (!result || result?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Grading system not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IGradingSystem>,
): Promise<GradingSystem> => {
  const gradeSystem = await prisma.gradingSystem.findUnique({
    where: { id },
  });
  if (!gradeSystem || gradeSystem?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Grading system not found!');
  }

  const result = await prisma.gradingSystem.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Grading system not updated!');
  }

  return result;
};

const updateGrade = async (
  gradeId: string,
  payload: Partial<IGrade>,
) => {
  const grade = await prisma.grade.findUnique({
    where: { id: gradeId }
  });
  if (!grade) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Grades not found!');
  }

  const result = await prisma.grade.update({
    where: { id: gradeId },
    data:payload,
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Grade option updated failed!',
    );
  }
  return result;
};

const deleteFromDB = async (id: string): Promise<GradingSystem> => {
  const gradeSystem = await prisma.gradingSystem.findUniqueOrThrow({
    where: { id },
  });
  if (!gradeSystem || gradeSystem?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Grading system not found!');
  }

  const result = await prisma.gradingSystem.update({
    where: { id },
    data: {
      isDeleted: true,
    },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Grading system not deleted!');
  }

  return result;
};

const deleteGrade = async (gradeId: string) => {
  const grade = await prisma.grade.findUnique({
    where: { id: gradeId }
  });
  if (!grade) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Grade options not found!');
  }
  
  const result = await prisma.grade.delete({
    where: { id: gradeId },
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Grade option deletion failed!',
    );
  }
  return result;
};

export const GradingSystemService = {
  insertIntoDB,
  addGrade,
  getAllFromDB,
  getGradesByGradingSystemId,
  getByIdFromDB,
  updateIntoDB,
  updateGrade,
  deleteFromDB,
  deleteGrade,
};
