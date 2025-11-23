import { Certificate, Prisma, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  ICertificate,
  ICertificateFilterRequest,
} from './certificate.interface';
import { certificateSearchAbleFields } from './certificate.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';
import { generateEnrollmentId } from '../../utils/generateEnrollmentId';

const insertIntoDB = async (payload: ICertificate) => {
  const { userId, enrolledCourseId } = payload;

  // 1️⃣ Validate Student
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isDeleted: false,
      status: UserStatus.active,
    },
  });
  if (!user) throw new ApiError(httpStatus.BAD_REQUEST, 'Student not found!');

  // 2️⃣ Validate Enrollment + Fetch Full Course
  const enrollment = await prisma.enrolledCourse.findFirst({
    where: { id: enrolledCourseId, userId, isDeleted: false },
    include: {
      author: true, // Course Author (User table)
      course: { include: { author: true } },
    },
  });

  if (!enrollment)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'User is not enrolled in this course!',
    );

  if (!enrollment.isComplete)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Cannot create certificate. Course is not completed!',
    );

  // 3️⃣ Prevent Duplicate
  const existingCertificate = await prisma.certificate.findFirst({
    where: { userId, enrolledCourseId },
  });
  if (existingCertificate) return existingCertificate;

  // Extract useful data
  const course = enrollment.course;
  const courseAuthorId = course.authorId;

  // 4️⃣ Auto-assign: authorId, courseId, platform
  payload.authorId = courseAuthorId;
  payload.courseId = course.id;
  payload.platform = enrollment.platform;

  // 5️⃣ Auto-assign studyHour from learningTime (minutes → hours)
  payload.studyHour = Number((enrollment.learningTime / 60).toFixed(2));

  // 6️⃣ Auto-assign topics
  payload.topics = course.topics || [];

  // 7️⃣ Auto-assign completeDate
  payload.completeDate = new Date().toISOString();

  const courseCategory = course.category;
  // 8️⃣ Auto-generate unique reference: Ensinor-xxxxx
  payload.reference = generateEnrollmentId(
    courseCategory,
    user.name || 'student',
  );

  // 9️⃣ Find CertificateBuilder for this Author (Course Author)
  const builder = await prisma.certificateBuilder.findFirst({
    where: { authorId: courseAuthorId },
  });

  
// 6️⃣ Handle topics based on isVisibleTopics
if (builder && builder.isVisibleTopics === false) {
  payload.topics = []; // forcefully remove topics
} else {
  payload.topics = course.topics || [];
}

  if (builder) {
    payload.company = builder.company ?? '';
    payload.logo = builder.logo ?? '';
  } else {
    payload.company = '';
    payload.logo = '';
  }

  // 🔟 Resolve Instructor & Designation
  let instructorName = null;
  let insDesignation = null;

  // Check multiple role tables that belong to instructor (User)
  const instructorUser = await prisma.user.findFirst({
    where: { id: courseAuthorId },
    include: {
      superAdmin: true,
      companyAdmin: true,
      businessInstructor: true,
      instructor: true,
    },
  });

  if (instructorUser) {
    instructorName = instructorUser.name;

    if (instructorUser.superAdmin) {
      insDesignation = null;
    } else if (instructorUser.companyAdmin) {
      insDesignation = null;
    } else if (instructorUser.businessInstructor) {
      insDesignation = instructorUser.businessInstructor.designation || null;
    } else if (instructorUser.instructor) {
      insDesignation = instructorUser.instructor.designation || null;
    }
  }

  payload.instructor = instructorName ?? '';
  (payload as any).insDesignation = insDesignation ?? '';

  // 1️⃣1️⃣ Auto-assign student (Name from User)
  payload.student = user.name;

  // 1️⃣2️⃣ Create Certificate
  const result = await prisma.certificate.create({
    data: payload,
  });

  if (!result)
    throw new ApiError(httpStatus.BAD_REQUEST, 'Certificate creation failed!');

  return result;
};

const getAllFromDB = async (
  params: ICertificateFilterRequest,
  options: IPaginationOptions,
  filterBy: { authorId?: string; userId?: string },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.CertificateWhereInput[] = [];

  // Filter either by authorId or userId
  if (filterBy.authorId) {
    andConditions.push({ authorId: filterBy.authorId });
  }
  if (filterBy.userId) {
    andConditions.push({ userId: filterBy.userId });
  }

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: certificateSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.CertificateWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.certificate.findMany({
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
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
        },
      },
      course: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  const total = await prisma.certificate.count({
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

const getByEnrolledIdFromDB = async (enrolledId: string): Promise<Certificate | null> => {
  const result = await prisma.certificate.findFirst({
    where: { enrolledCourseId: enrolledId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
        },
      },
      course: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Certificate not found!');
  }

  return result;
};

const getByIdFromDB = async (id: string): Promise<Certificate | null> => {
  const result = await prisma.certificate.findUnique({
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
      course: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Certificate not found!');
  }

  return result;
};

const validateByReference = async (
  refId: string,
): Promise<Certificate | null> => {
  const result = await prisma.certificate.findFirst({
    where: { reference: refId },
  });
  if (!result) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "The validation number is not valid. Didn't found certificate",
    );
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<ICertificate>,
): Promise<Certificate> => {
  const certificate = await prisma.certificate.findUnique({
    where: { id },
  });
  if (!certificate) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Certificate not found!');
  }

  const result = await prisma.certificate.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Certificate not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<Certificate> => {
  const certificate = await prisma.certificate.findUniqueOrThrow({
    where: { id },
  });
  if (!certificate) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Certificate not found!');
  }

  const result = await prisma.certificate.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Certificate not deleted!');
  }

  return result;
};

export const CertificateService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  getByEnrolledIdFromDB,
  validateByReference,
  updateIntoDB,
  deleteFromDB,
};
