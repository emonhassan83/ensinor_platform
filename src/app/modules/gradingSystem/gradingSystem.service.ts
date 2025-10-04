import {
  CoursesStatus,
  GradingSystem,
  Prisma,
  UserStatus,
} from '@prisma/client';
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
import httpStatus from 'http-status';

const insertIntoDB = async (payload: IGradingSystem, currentUser: any) => {
  const { courseId, authorId } = payload;

  // 1. Validate user existence
  const author = await prisma.user.findUnique({
    where: { id: authorId, status: UserStatus.active, isDeleted: false },
  });
  if (!author) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Author not found!');
  }

  // 2. Set isDefault based on current user role
  if (currentUser.role === 'super_admin') {
    payload.isDefault = true;
  } else {
    payload.isDefault = false;

    // Validate normal users cannot create grading system for other users
    if (authorId !== currentUser.userId) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'You can only create grading system for yourself!',
      );
    }
  }

  // 3. If not default, validate course existence
  if (!payload.isDefault) {
    const course = await prisma.course.findUnique({
      where: { id: courseId, status: CoursesStatus.approved, isDeleted: false },
    });
    if (!course) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Course not found!');
    }

    // 4. Prevent duplicate grading system for same course & author
    const existingSystem = await prisma.gradingSystem.findFirst({
      where: {
        courseId,
        authorId,
        isDeleted: false,
      },
    });
    if (existingSystem) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'You have already created a grading system for this course!',
      );
    }
  } else {
    // 5. For default grading system, prevent duplicates
    const existingDefault = await prisma.gradingSystem.findFirst({
      where: {
        isDefault: true,
        isDeleted: false,
      },
    });
    if (existingDefault) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Default grading system already exists!',
      );
    }
  }

  // 6. Create grading system
  const result = await prisma.gradingSystem.create({
    data: payload,
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
  const { gradingSystemId, minScore, maxScore, gradeLabel } = payload;

  // 1️⃣ Validate grading system existence
  const gradingSystem = await prisma.gradingSystem.findUnique({
    where: { id: gradingSystemId, isDeleted: false },
    include: { grades: true },
  });

  if (!gradingSystem) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Grading system not found!');
  }

  // 2️⃣ Validate score range
  if (minScore < 0 || maxScore > 100 || minScore > maxScore) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Invalid score range! minScore must be >= 0, maxScore <= 100, and minScore <= maxScore.',
    );
  }

  // 3️⃣ Check for overlapping score ranges
  const overlap = gradingSystem.grades.some(
    g =>
      (minScore >= g.minScore && minScore <= g.maxScore) ||
      (maxScore >= g.minScore && maxScore <= g.maxScore) ||
      (minScore <= g.minScore && maxScore >= g.maxScore),
  );

  if (overlap) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'This grade range overlaps with an existing grade in the system!',
    );
  }

  // 4️⃣ Check for duplicate grade label
  const duplicateLabel = gradingSystem.grades.some(
    g => g.gradeLabel === gradeLabel,
  );
  if (duplicateLabel) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'This grade label already exists in the grading system!',
    );
  }

  // 5️⃣ Create the grade
  const result = await prisma.grade.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Grade creation failed!');
  }

  return result;
};

const getAllFromDB = async (
  params: IGradingSystemFilterRequest,
  options: IPaginationOptions,
  filterBy?: {
    authorId?: string;
    courseId?: string;
  },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.GradingSystemWhereInput[] = [
    { isDeleted: false },
  ];
  // Filter either by authorId, courseId, bookId or eventId
  if (filterBy && filterBy.authorId) {
    andConditions.push({ authorId: filterBy.authorId });
  }
  if (filterBy && filterBy.courseId) {
    andConditions.push({ courseId: filterBy.courseId });
  }

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
    include: {
      grades: {
        select: { id: true, minScore: true, maxScore: true, gradeLabel: true },
      },
      course: { select: { title: true } },
    },
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
    where: { id: gradeId },
  });

  if (!grade) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Grade not found!');
  }

  const result = await prisma.grade.findMany({
    where: { gradingSystemId: gradeId },
  });
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
      course: { select: { title: true } },
    },
  });

  if (!result || result?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Grading system not found!');
  }

  return result;
};

const getDefaultGradingSystemFromDB = async (): Promise<GradingSystem | null> => {
  const result = await prisma.gradingSystem.findFirst({
    where: { isDefault: true, isDeleted: false },
    include: {
      grades: {
        orderBy: { minScore: 'desc' },
      },
      course: {
        select: { title: true },
      },
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No default grading system found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IGradingSystem>,
): Promise<GradingSystem> => {
  const gradeSystem = await prisma.gradingSystem.findUnique({
    where: { id, isDeleted: false },
  });
  if (!gradeSystem) {
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

const updateGrade = async (gradeId: string, payload: Partial<IGrade>) => {
  const grade = await prisma.grade.findUnique({
    where: { id: gradeId },
  });
  if (!grade) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Grades not found!');
  }

  const result = await prisma.grade.update({
    where: { id: gradeId },
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Grade option updated failed!');
  }
  return result;
};

const deleteFromDB = async (id: string): Promise<GradingSystem> => {
  const gradeSystem = await prisma.gradingSystem.findUniqueOrThrow({
    where: { id, isDeleted: false },
  });
  if (!gradeSystem) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Grading system not found!');
  }

  const result = await prisma.$transaction(async tx => {
    // 1. Fetch the grading system
    const gradeSystem = await tx.gradingSystem.findUnique({
      where: { id, isDeleted: false },
    });

    if (!gradeSystem) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Grading system not found!');
    }

    // 2. delete all grades associated with this grading system
    await tx.grade.deleteMany({
      where: { gradingSystemId: id },
    });

    // 3. Soft delete the grading system itself
    const deletedSystem = await tx.gradingSystem.update({
      where: { id },
      data: { isDeleted: true },
    });

    return deletedSystem;
  });

  return result;
};

const deleteGrade = async (gradeId: string) => {
  const grade = await prisma.grade.findUnique({
    where: { id: gradeId },
  });
  if (!grade) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Grade options not found!');
  }

  const result = await prisma.grade.delete({
    where: { id: gradeId },
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Grade option deletion failed!');
  }
  return result;
};

export const GradingSystemService = {
  insertIntoDB,
  addGrade,
  getAllFromDB,
  getGradesByGradingSystemId,
  getDefaultGradingSystemFromDB,
  getByIdFromDB,
  updateIntoDB,
  updateGrade,
  deleteFromDB,
  deleteGrade,
};
