import { Certificate, CompanyType, Prisma, SubscriptionStatus, SubscriptionType, UserRole, UserStatus } from '@prisma/client';
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

  /* =====================================================
     1️⃣ Validate Student
  ===================================================== */
  const user = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false, status: UserStatus.active },
  });
  if (!user) throw new ApiError(httpStatus.BAD_REQUEST, 'Student not found!');

  /* =====================================================
     2️⃣ Validate Enrollment + Course
  ===================================================== */
  const enrollment = await prisma.enrolledCourse.findFirst({
    where: { id: enrolledCourseId, userId, isDeleted: false },
    include: {
      course: {
        include: {
          companies: true,
          author: {
            include: {
              subscription: true,
              instructor: true,
              businessInstructor: { include: { company: true } },
              companyAdmin: { include: { company: true } },
              superAdmin: true,
            },
          },
        },
      },
    },
  });

  if (!enrollment)
    throw new ApiError(httpStatus.BAD_REQUEST, 'User not enrolled in course!');

  if (!enrollment.isComplete)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Cannot create certificate. Course not completed!',
    );

  /* =====================================================
     3️⃣ Prevent Duplicate
  ===================================================== */
  const exists = await prisma.certificate.findFirst({
    where: { userId, enrolledCourseId },
  });
  if (exists) return exists;

  const course = enrollment.course;
  const author = course.author;

  /* =====================================================
     4️⃣ Auto Assign Fields
  ===================================================== */
  payload.authorId = author.id;
  payload.courseId = course.id;
  payload.platform = enrollment.platform;
  payload.studyHour = Number((enrollment.learningTime / 60).toFixed(2));
  payload.completeDate = new Date().toISOString();
  payload.student = user.name;
  payload.topics = course.topics || [];

  let prefix = 'EN';
  if (course.platform === 'company' && course.companies?.name) {
    prefix = course.companies.name.substring(0, 2).toUpperCase();
  }
  payload.reference = generateEnrollmentId(prefix);

  /* =====================================================
     🔐 CERTIFICATE BUILDER ACCESS CONTROL
  ===================================================== */
  let allowBuilder = true;

  // 🔹 Case 1: Normal Instructor
  if (author.role === UserRole.instructor) {
    const activeSub = author.subscription.find(
      s =>
        s.status === SubscriptionStatus.active &&
        !s.isExpired &&
        !s.isDeleted &&
        new Date(s.expiredAt) > new Date(),
    );

    if (!activeSub || activeSub.type !== SubscriptionType.premium) {
      allowBuilder = false;
    }
  }

  // 🔹 Case 2: Business Instructor
  if (author.role === UserRole.business_instructors) {
    const company = author.businessInstructor?.company;

    if (!company || company.industryType !== CompanyType.enterprise) {
      allowBuilder = false;
    }

    const companySub = author.subscription.find(
      s =>
        s.status === SubscriptionStatus.active &&
        !s.isExpired &&
        !s.isDeleted &&
        new Date(s.expiredAt) > new Date(),
    );

    if (!companySub) {
      allowBuilder = false;
    }
  }

  // 🔹 Case 3: Company Admin
  if (author.role === UserRole.company_admin) {
    const company = author.companyAdmin?.company;

    if (!company || company.industryType !== CompanyType.enterprise) {
      allowBuilder = false;
    }

    const companySub = author.subscription.find(
      s =>
        s.status === SubscriptionStatus.active &&
        !s.isExpired &&
        !s.isDeleted &&
        new Date(s.expiredAt) > new Date(),
    );

    if (!companySub) {
      allowBuilder = false;
    }
  }

  /* =====================================================
     6️⃣ Load Certificate Builder (If Allowed)
  ===================================================== */
  let builder = null;

  if (allowBuilder) {
    builder = await prisma.certificateBuilder.findFirst({
      where: { authorId: author.id, isDeleted: false },
    });
  }

  if (builder) {
    payload.company = builder.company ?? '';
    payload.logo = builder.logo ?? '';

    if (builder.isVisibleTopics === false) {
      payload.topics = [];
    }
  } else {
    payload.company = '';
    payload.logo = '';
    payload.topics = course.topics || [];
  }

  /* =====================================================
     👨‍🏫 Instructor Name & Designation
  ===================================================== */
  payload.instructor = author.name;

  let insDesignation: string | null = null;

  if (author.businessInstructor) {
    insDesignation = author.businessInstructor.designation;
  } else if (author.instructor) {
    insDesignation = author.instructor.designation;
  }

  (payload as any).insDesignation = insDesignation ?? '';

  /* =====================================================
     8️⃣ Create Certificate
  ===================================================== */
  const result = await prisma.certificate.create({ data: payload });

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

const getByEnrolledIdFromDB = async (
  enrolledId: string,
): Promise<Certificate | null> => {
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
