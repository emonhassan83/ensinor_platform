import {
  Company,
  Course,
  CoursesStatus,
  Prisma,
  User,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { ICourse, ICourseFilterRequest } from './course.interface';
import { courseSearchAbleFields } from './course.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { uploadToS3 } from '../../utils/s3';
import httpStatus from 'http-status';

const insertIntoDB = async (payload: ICourse, file: any) => {
  const { authorId, instructorId, companyId } = payload;

  // === Validate Author
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

  // === Validate Instructor (optional) ===
  let instructor: User | null = null;
  if (instructorId) {
    instructor = await prisma.user.findFirst({
      where: {
        id: instructorId,
        status: UserStatus.active,
        isDeleted: false,
      },
    });
    if (!instructor) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Instructor not found!');
    }
  }

  // === Validate Company (if provided) ===
  let company: Company | null = null;
  if (companyId) {
    company = await prisma.company.findFirst({
      where: {
        id: companyId,
        userId: authorId,
        isDeleted: false,
      },
    });
    if (!company) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Company not found!');
    }
  }

  // upload to image
  if (file) {
    payload.thumbnail = (await uploadToS3({
      file,
      fileName: `images/courses/thumbnail/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  // sent isFreeCourse field
  payload.price === 0 && (payload.isFreeCourse = true);
  author.role === UserRole.super_admin &&
    (payload.status = CoursesStatus.approved as any);

  // Create Course + Update Counts ===
  const result = await prisma.$transaction(async tx => {
    const newCourse = await tx.course.create({
      data: payload,
    });
    if (!newCourse) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Course creation failed!');
    }

    // Increase company course count
    if (companyId) {
      await tx.company.update({
        where: { id: companyId },
        data: {
          courses: { increment: 1 },
        },
      });
    }

    // If instructor exists
    if (instructorId) {
      const businessInstructor = await tx.businessInstructor.findUnique({
        where: { userId: instructorId },
      });

      if (businessInstructor) {
        await tx.businessInstructor.update({
          where: { id: businessInstructor.id },
          data: { courses: { increment: 1 } },
        });
      } else {
        const instructorRecord = await tx.instructor.findUnique({
          where: { userId: instructorId },
        });
        if (instructorRecord) {
          await tx.instructor.update({
            where: { id: instructorRecord.id },
            data: { courses: { increment: 1 } },
          });
        }
      }
    }

    return newCourse;
  });

  return result;
};

const getAllFromDB = async (
  params: ICourseFilterRequest,
  options: IPaginationOptions,
  filterBy: {
    authorId?: string;
    instructorId?: string;
    companyId?: string;
  },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.CourseWhereInput[] = [{ isDeleted: false }];
  // Filter either by authorId, instructorId
  if (filterBy.authorId) {
    andConditions.push({ authorId: filterBy.authorId });
  }
  if (filterBy.instructorId) {
    andConditions.push({ instructorId: filterBy.instructorId });
  }
  if (filterBy.companyId) {
    andConditions.push({ companyId: filterBy.companyId });
  }

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: courseSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.CourseWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.course.findMany({
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

  const total = await prisma.course.count({
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

const getByIdFromDB = async (id: string): Promise<Course | null> => {
  const result = await prisma.course.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
        },
      },
      courseContent: {
        select: {
          id: true,
          title: true,
          video: true,
          duration: true,
        },
      },
      resource: true,
    },
  });

  if (!result || result?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Course not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<ICourse>,
  file: any,
): Promise<Course> => {
  const course = await prisma.course.findUnique({
    where: { id },
  });
  if (!course || course?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found!');
  }

  // upload file here
  if (file) {
    payload.thumbnail = (await uploadToS3({
      file,
      fileName: `images/courses/thumbnail/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await prisma.course.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not updated!');
  }

  return result;
};

const changeStatusIntoDB = async (
  id: string,
  payload: { status: CoursesStatus },
): Promise<Course> => {
  const { status } = payload;

  const course = await prisma.course.findUnique({
    where: { id },
  });
  if (!course || course?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found!');
  }

  const result = await prisma.course.update({
    where: { id },
    data: { status },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course status not updated!');
  }

  // sent notify to author when changed status

  return result;
};

const deleteFromDB = async (id: string): Promise<Course> => {
  const course = await prisma.course.findUniqueOrThrow({
    where: { id },
  });
  if (!course || course?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found!');
  }

  const result = await prisma.course.update({
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

export const CourseService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  changeStatusIntoDB,
  deleteFromDB,
};
