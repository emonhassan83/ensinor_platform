import {
  CertificateRequest,
  CertificateRequestStatus,
  Prisma,
  UserStatus,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  ICertificateRequest,
  ICertificateRequestFilterRequest,
} from './certificateRequest.interface';
import { certificateRequestSearchAbleFields } from './certificateRequest.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';
import {
  sendCertificateRequestNotificationToAuthor,
  sendCertificateStatusNotificationToUser,
} from './certificateRequest.utils';

const insertIntoDB = async (payload: ICertificateRequest) => {
  const { userId, courseId } = payload;

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      status: UserStatus.active,
      isDeleted: false,
    },
  });
  if (!user) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Certificate request user not found!',
    );
  }

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      isDeleted: false,
    },
    include: {
      author: true,
    },
  });
  if (!course) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Courses not found!');
  }

  // Validate enrollment
  const enrollment = await prisma.enrolledCourse.findFirst({
    where: { userId, courseId, isDeleted: false },
  });
  if (!enrollment) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'User is not enrolled in this course!',
    );
  }

  //  Check if course is completed
  if (!enrollment.isComplete) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Cannot create certificate request. Course is not completed!',
    );
  }

  // Check if a pending certificate request already exists
  const existingRequest = await prisma.certificateRequest.findFirst({
    where: {
      userId,
      courseId,
      status: CertificateRequestStatus.denied,
    },
  });
  if (existingRequest) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'A pending certificate request already exists for this course!',
    );
  }

  // Create certificate request
  const result = await prisma.certificateRequest.create({
    data: { ...payload, authorId: course.authorId },
  });
  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Certificate request creation failed!',
    );
  }

  // Notify course author
  await sendCertificateRequestNotificationToAuthor(course.author, result);

  return result;
};

const getAllFromDB = async (
  params: ICertificateRequestFilterRequest,
  options: IPaginationOptions,
  filterBy: { userId?: string; authorId?: string },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.CertificateRequestWhereInput[] = [];

  // Filter either by authorId or userId
  if (filterBy.userId) {
    andConditions.push({ userId: filterBy.userId });
  }
  if (filterBy.authorId) {
    andConditions.push({ authorId: filterBy.authorId });
  }

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: certificateRequestSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.CertificateRequestWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.certificateRequest.findMany({
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
          thumbnail: true,
          shortDescription: true,
          category: true,
          level: true,
          language: true,
        },
      },
    },
  });

  const total = await prisma.certificateRequest.count({
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

const getByIdFromDB = async (id: string): Promise<any> => {
  const result = await prisma.certificateRequest.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
          role: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      course: {
        select: {
          id: true,
          title: true,
          category: true,
          level: true,
          hasCertificate: true,
          duration: true,
          lectures: true,
        },
      },
    },
  });

  if (!result) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Oops! Certificate request not found!',
    );
  }

  // student = authorId
  const studentId = result.userId;
  const courseId = result.courseId;

  // enrollment info
  const enrollment = await prisma.enrolledCourse.findFirst({
    where: { userId: studentId, courseId, isDeleted: false },
    select: {
      id: true,
      completedRate: true,
      courseMark: true,
      grade: true,
      learningTime: true,
      lectureWatched: true,
      isComplete: true,
      lastActivity: true,
    },
  });

  // assignment submissions for this course
  const assignments = await prisma.assignmentSubmission.findMany({
    where: {
      userId: studentId,
      assignment: { courseId },
      isDeleted: false,
    },
    select: {
      id: true,
      assignmentId: true,
      marksObtained: true,
      totalMarks: true,
      grade: true,
      submittedAt: true,
      isChecked: true,
      feedback: true,
    },
  });

  // quiz attempts for this course
  const quizzes = await prisma.quizAttempt.findMany({
    where: {
      userId: studentId,
      quiz: { courseId },
      isDeleted: false,
    },
    select: {
      id: true,
      quizId: true,
      marksObtained: true,
      totalMarks: true,
      grade: true,
      correctRate: true,
      timeTaken: true,
      lastAttempt: true,
      isCompleted: true,
    },
  });

  return {
    ...result,
    enrollment,
    assignments,
    quizzes,
  };
};

const updateIntoDB = async (
  id: string,
  payload: { status: CertificateRequestStatus },
): Promise<CertificateRequest> => {
  const { status } = payload;

  const certificateRequest = await prisma.certificateRequest.findUnique({
    where: { id },
    include: { author: true },
  });
  if (!certificateRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Certificate request not found!');
  }

  const result = await prisma.certificateRequest.update({
    where: { id },
    data: { status },
  });
  if (!result) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Certificate request not updated!',
    );
  }

  // 3. If approved → create certificate automatically
  if (status === CertificateRequestStatus.approved) {
    // Ensure no duplicate certificate
    const existingCertificate = await prisma.certificate.findFirst({
      where: {
        userId: certificateRequest.authorId,
        courseId: certificateRequest.courseId,
      },
    });

    if (!existingCertificate) {
      await prisma.certificate.create({
        data: {
          userId: certificateRequest.authorId,
          authorId: certificateRequest.userId,
          courseId: certificateRequest.courseId,
        },
      });
    }
  }

  // Notify student about status change
  await sendCertificateStatusNotificationToUser(
    certificateRequest.author,
    result,
  );

  return result;
};

const deleteFromDB = async (id: string): Promise<CertificateRequest> => {
  const certificateRequest = await prisma.certificateRequest.findUniqueOrThrow({
    where: { id },
  });
  if (!certificateRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Certificate request not found!');
  }

  const result = await prisma.certificateRequest.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Certificate request not deleted!',
    );
  }

  return result;
};

export const CertificateRequestService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
