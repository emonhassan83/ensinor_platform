import {
  ChatRole,
  ChatType,
  Company,
  Course,
  CoursesStatus,
  PlatformType,
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
import { findAdmin } from '../../utils/findAdmin';
import { sendNotifYToAdmin, sendNotifYToUser } from './course.utils';

const insertIntoDB = async (payload: ICourse, file: any) => {
  const { platform, authorId: inputAuthorId } = payload;

  let resolvedAuthorId: string = inputAuthorId;
  let resolvedCompanyId: string | undefined;
  let companyAuthor: User | null = null;
  let company: Company | null = null;

  // 🔹 CASE: Platform = Company
  if (platform === PlatformType.company) {
    const actor = await prisma.user.findFirst({
      where: {
        id: inputAuthorId,
        status: UserStatus.active,
        isDeleted: false,
      },
      include: {
        companyAdmin: { include: { company: true } },
        businessInstructor: {
          include: {
            company: { include: { author: { include: { user: true } } } },
          },
        },
      },
    });

    if (!actor) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Actor user not found!');
    }

    if (actor.role === UserRole.company_admin) {
      // company admin → author = self
      resolvedAuthorId = actor.id;
      resolvedCompanyId = actor.companyAdmin?.company?.id ?? undefined;
    } else if (actor.role === UserRole.business_instructors) {
      // business instructor → company admin becomes author
      resolvedCompanyId = actor.businessInstructor?.company?.id;

      const companyAdminUser = actor.businessInstructor?.company?.author?.user;
      if (!companyAdminUser) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Company admin not linked with this business instructor.',
        );
      }

      resolvedAuthorId = companyAdminUser.id;
      companyAuthor = companyAdminUser;
    } else {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Only company admin or business instructor can create company courses.',
      );
    }

    // validate company
    company = await prisma.company.findFirst({
      where: { id: resolvedCompanyId, isDeleted: false },
      include: { author: { include: { user: true } } },
    });
    if (!company)
      throw new ApiError(httpStatus.NOT_FOUND, 'Company not found!');
    if (!company.isActive)
      throw new ApiError(httpStatus.BAD_REQUEST, 'Company is not active!');
  }

  // 🔹 Upload thumbnail (if file provided)
  if (file) {
    payload.thumbnail = (await uploadToS3({
      file,
      fileName: `images/courses/thumbnail/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  // 🔹 Set free flag if price = 0
  if (typeof payload.price === 'number' && payload.price === 0) {
    payload.isFreeCourse = true;
  }

  // fetch author user (for notifications)
  const authorUser = await prisma.user.findUnique({
    where: { id: resolvedAuthorId },
  });

  // 🔹 Create transaction
  const result = await prisma.$transaction(async tx => {
    const newCourse = await tx.course.create({
      data: {
        ...payload,
        authorId: resolvedAuthorId,
        companyId: resolvedCompanyId ?? null,
      },
    });

    // update counters
    if (company) {
      await tx.company.update({
        where: { id: company.id },
        data: { courses: { increment: 1 } },
      });
    }
    
    // 🔹 Update author profile counters
    if (platform === PlatformType.admin) {
      // If platform = admin → Instructor profile update
      await tx.instructor.updateMany({
        where: { userId: resolvedAuthorId },
        data: { courses: { increment: 1 } },
      });
    } else if (platform === PlatformType.company) {
      // If platform = company → check role
      if (companyAuthor) {
        // created by business instructor → increment businessInstructor.courses
        await tx.businessInstructor.updateMany({
          where: { userId: inputAuthorId },
          data: { courses: { increment: 1 } },
        });
      } else {
        // created by company admin → increment companyAdmin.courses
        await tx.companyAdmin.updateMany({
          where: { userId: resolvedAuthorId },
          data: { courses: { increment: 1 } },
        });
      }
    }

    return newCourse;
  });

  // 🔹 Send notifications
  if (platform === PlatformType.admin) {
    const admin = await findAdmin();
    if (!admin) throw new Error('Super admin not found!');
    await sendNotifYToAdmin(authorUser!, admin);
  } else if (platform === PlatformType.company && companyAuthor) {
    await sendNotifYToAdmin(authorUser!, companyAuthor);
  }

  return result;
};

const getPopularCoursesFromDB = async () => {
  const andConditions: Prisma.CourseWhereInput[] = [{ isDeleted: false }];

  const whereConditions: Prisma.CourseWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.course.findMany({
    where: whereConditions,
    take: 5,
    orderBy: {
      enrollments: 'desc',
    },
  });

  return result;
};

const getAllFromDB = async (
  params: ICourseFilterRequest,
  options: IPaginationOptions,
  filterBy: {
    authorId?: string;
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
            avgRating: 'desc',
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

const getAllFilterDataFromDB = async () => {
  const andConditions: Prisma.CourseWhereInput[] = [
    { status: CoursesStatus.approved, isDeleted: false },
  ];

  const whereConditions: Prisma.CourseWhereInput = {
    AND: andConditions,
  };

  // === Categories ===
  const categories = await prisma.course.groupBy({
    by: ['category'],
    where: whereConditions,
    _count: { category: true },
    orderBy: { category: 'asc' }, // alphabetically
  });

  const formattedCategories = categories.map(item => ({
    name: item.category,
    count: item._count.category,
  }));

  // === Price (free vs paid) ===
  const freePaid = await prisma.course.groupBy({
    by: ['isFreeCourse'],
    where: whereConditions,
    _count: { isFreeCourse: true },
  });

  const priceFilter = {
    free: freePaid.find(f => f.isFreeCourse === true)?._count.isFreeCourse || 0,
    paid:
      freePaid.find(f => f.isFreeCourse === false)?._count.isFreeCourse || 0,
  };

  // === Skill Levels ===
  const levels = await prisma.course.groupBy({
    by: ['level'],
    where: whereConditions,
    _count: { level: true },
    orderBy: { level: 'asc' },
  });

  const formattedLevels = levels.map(item => ({
    name: item.level,
    count: item._count.level,
  }));

  // === Languages ===
  const languages = await prisma.course.groupBy({
    by: ['language'],
    where: whereConditions,
    _count: { language: true },
    orderBy: { language: 'asc' },
  });

  const formattedLanguages = languages.map(item => ({
    name: item.language,
    count: item._count.language,
  }));

  return {
    data: {
      categories: formattedCategories,
      price: priceFilter,
      levels: formattedLevels,
      languages: formattedLanguages,
    },
  };
};

const getByIdFromDB = async (id: string): Promise<Course | null> => {
  const result = await prisma.course.findUnique({
    where: { id, isDeleted: false },
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
      assignment: true,
    },
  });

  if (!result) {
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
    where: { id, isDeleted: false },
  });
  if (!course) {
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

  return await prisma.$transaction(async prismaTx => {
    // 1. Fetch course
    const course = await prismaTx.course.findUnique({
      where: { id, isDeleted: false },
    });
    if (!course) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Course not found!');
    }

    const prevStatus = course.status;

    // 2. Update course status
    const result = await prismaTx.course.update({
      where: { id },
      data: { status },
    });
    if (!result) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Course status not updated!');
    }

    // 3. Only on pending → approved
    if (
      prevStatus === CoursesStatus.pending &&
      status === CoursesStatus.approved
    ) {
      // Check existing chats
      const existingChats = await prismaTx.chat.findMany({
        where: {
          courseId: course.id,
          type: { in: [ChatType.group, ChatType.announcement] },
          isDeleted: false,
        },
        select: { type: true },
      });

      const hasGroup = existingChats.some(c => c.type === ChatType.group);
      const hasAnnouncement = existingChats.some(
        c => c.type === ChatType.announcement,
      );

      // 3a. Discussion Chat
      if (!hasGroup) {
        await prismaTx.chat.create({
          data: {
            type: ChatType.group,
            groupName: `${course.title} Discussion`,
            groupImage: course.thumbnail || null,
            courseId: course.id,
            isReadOnly: false,
            participants: {
              createMany: {
                data: [{ userId: course.authorId!, role: ChatRole.admin }],
              },
            },
          },
        });
      }

      // 3b. Announcement Chat
      if (!hasAnnouncement) {
        await prismaTx.chat.create({
          data: {
            type: ChatType.announcement,
            groupName: `${course.title} Announcement`,
            groupImage: course.thumbnail || null,
            courseId: course.id,
            isReadOnly: true,
          },
        });
      }
    }

    // 4. Send notify to instructor
    await sendNotifYToUser(status, course.authorId!);

    return result;
  });
};

const deleteFromDB = async (id: string): Promise<Course> => {
  const course = await prisma.course.findUniqueOrThrow({
    where: { id, isDeleted: false },
  });
  if (!course) {
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

  // sent notify to author when changed status
  await sendNotifYToUser('deleted', course.authorId);

  return result;
};

export const CourseService = {
  insertIntoDB,
  getPopularCoursesFromDB,
  getAllFromDB,
  getAllFilterDataFromDB,
  getByIdFromDB,
  updateIntoDB,
  changeStatusIntoDB,
  deleteFromDB,
};
