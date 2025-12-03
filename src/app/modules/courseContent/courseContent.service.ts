import { CourseLesson, CourseSection, Prisma } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  ICourseLesson,
  ICourseContentFilterRequest,
  ICourseSection,
} from './courseContent.interface';
import { courseContentSearchAbleFields } from './courseContent.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';

const insertIntoDB = async (
  payload: { courseId: string; section: ICourseSection[] },
  authorId: string,
) => {
  const { courseId, section } = payload;

  // Validate course belongs to author
  const course = await prisma.course.findFirst({
    where: { id: courseId, authorId, isDeleted: false },
  });

  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found!');
  }

  return await prisma.$transaction(async tx => {
    let totalLectures = 0;
    let totalDuration = 0;
    const createdSections: {
      section: ICourseSection;
      lessons: ICourseLesson[];
    }[] = [];

    // Loop through each section in payload
    for (const sec of section) {
      // STEP 1: Create Section
      const createdSection = await tx.courseSection.create({
        data: {
          courseId,
          title: sec.title,
          description: sec.description,
        },
      });

      if (!createdSection) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Section creation failed!');
      }

      // STEP 2: Prepare lessons for this section
      const lessonsToCreate = sec.lesson.map(item => ({
        sectionId: createdSection.id,
        serial: item.serial,
        title: item.title,
        description: item.description,
        type: item.type,
        media: item.media,
        duration: item.duration ?? 0,
      }));

      // STEP 3: Create all lessons
      await tx.courseLesson.createMany({
        data: lessonsToCreate,
      });

      // STEP 4: Track totals
      totalLectures += lessonsToCreate.length;
      totalDuration += lessonsToCreate.reduce(
        (sum, l) => sum + (l.duration || 0),
        0,
      );

      createdSections.push({
        section: { ...sec, courseId },
        lessons: lessonsToCreate,
      });
    }

    // STEP 5: Update parent course with total lectures & duration
    await tx.course.update({
      where: { id: courseId },
      data: {
        lectures: { increment: totalLectures },
        duration: { increment: totalDuration },
      },
    });

    return createdSections;
  });
};

const addLessonIntoDB = async (payload: ICourseLesson) => {
  const { sectionId } = payload;

  return await prisma.$transaction(async tx => {
    const courseSection = await tx.courseSection.findFirst({
      where: { id: sectionId },
      include: {
        course: { select: { id: true } },
      },
    });

    if (!courseSection) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Course section not found!');
    }

    // Ensure serial is integer
    const serial = Number(payload.serial);

    const createdLesson = await tx.courseLesson.create({
      data: {
        ...payload,
        serial,
      },
    });

    await tx.course.update({
      where: { id: courseSection.course.id },
      data: {
        lectures: { increment: 1 },
        duration: { increment: payload.duration ?? 0 },
      },
    });

    return createdLesson;
  });
};

const getAllFromDB = async (
  params: ICourseContentFilterRequest,
  options: IPaginationOptions,
  courseId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.CourseSectionWhereInput[] = [{ courseId }];

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: courseContentSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.CourseSectionWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.courseSection.findMany({
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
      courseContents: true,
    },
  });

  const total = await prisma.courseSection.count({
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

const updateIntoDB = async (
  id: string,
  payload: Partial<ICourseSection>,
): Promise<CourseSection> => {
  const section = await prisma.courseSection.findUnique({
    where: { id },
  });
  if (!section) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course section not found!');
  }

  const result = await prisma.courseSection.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course section not updated!');
  }

  return result;
};

const updateLessonIntoDB = async (
  id: string,
  payload: Partial<ICourseLesson>,
): Promise<CourseLesson> => {
  const content = await prisma.courseLesson.findUnique({
    where: { id },
    include: { section: { include: { course: { select: { id: true } } } } },
  });
  if (!content) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course lesson not found!');
  }

  const result = await prisma.courseLesson.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course lesson not updated!');
  }

  // if duration updated, adjust difference
  if (
    payload.duration &&
    content.duration &&
    payload.duration !== content.duration
  ) {
    const diff = payload.duration - content.duration;
    await prisma.course.update({
      where: { id: content.section.course.id },
      data: {
        duration: { increment: diff },
      },
    });
  }

  return result;
};

const deleteFromDB = async (sectionId: string) => {
  return await prisma.$transaction(async tx => {
    // 1️⃣ Fetch the section with its lessons
    const section = await tx.courseSection.findUnique({
      where: { id: sectionId },
      include: {
        course: {
          select: { id: true },
        },
        courseContents: true, // all lessons in this section
      },
    });

    if (!section) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Course section not found!');
    }

    // Calculate lecture count and duration to subtract
    const totalLecturesToRemove = section.courseContents.length;

    const totalDurationToRemove = section.courseContents.reduce(
      (acc, lesson) => acc + (lesson.duration ?? 0),
      0,
    );

    // 2️⃣ Delete all lessons related to this section
    await tx.courseLesson.deleteMany({
      where: { sectionId },
    });

    // 3️⃣ Delete the section
    const result = await tx.courseSection.delete({
      where: { id: sectionId },
    });

    // 4️⃣ Update course stats (lectures + duration)
    await tx.course.update({
      where: { id: section.course.id },
      data: {
        lectures: { decrement: totalLecturesToRemove },
        duration: { decrement: totalDurationToRemove },
      },
    });

    return result;
  });
};

const deleteLessonIntoDB = async (id: string): Promise<CourseLesson | null> => {
  const lesson = await prisma.courseLesson.findUnique({
    where: { id },
  });
  if (!lesson) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Course lesson not found!');
  }

  const result = await prisma.courseLesson.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course lesson deletion failed!');
  }
  return result;
};

export const CourseContentService = {
  insertIntoDB,
  addLessonIntoDB,
  getAllFromDB,
  updateIntoDB,
  updateLessonIntoDB,
  deleteFromDB,
  deleteLessonIntoDB,
};
