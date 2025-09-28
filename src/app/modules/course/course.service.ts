import {
  ChatRole,
  ChatType,
  Course,
  CoursesStatus,
  PlatformType,
  Prisma,
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
  const { platform, instructorId, authorId } = payload;

  let resolvedAuthorId: string | undefined = authorId;
  let resolvedInstructorId: string | undefined = instructorId;
  let resolvedCompanyId: string | undefined = payload.companyId;
  let companyAuthor: any = null;
  let company: any = null;

  // 🔹 1. Platform = Admin
  if (platform === PlatformType.admin) {
    const superAdmin = await findAdmin();
    if (!superAdmin)
      throw new ApiError(httpStatus.NOT_FOUND, 'Super admin not found!');

    if (!resolvedInstructorId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'InstructorId is required for admin platform.',
      );
    }

    resolvedAuthorId = superAdmin.id;
  }

  // 🔹 2. Platform = Company
  if (platform === PlatformType.company) {
    const actor = await prisma.user.findFirst({
      where: {
        id: resolvedAuthorId ?? resolvedInstructorId,
        status: UserStatus.active,
        isDeleted: false,
      },
      include: {
        companyAdmin: { select: { company: { select: { id: true } } } },
        businessInstructor: {
          select: {
            company: {
              select: { id: true, author: { select: { userId: true } } },
            },
          },
        },
      },
    });
    if (!actor)
      throw new ApiError(httpStatus.NOT_FOUND, 'Actor user not found!');

    if (actor.role === UserRole.company_admin) {
      // Case A: company admin creates course
      if (!resolvedInstructorId) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'InstructorId is required when company admin creates a course.',
        );
      }
      resolvedAuthorId = actor.id;
      resolvedCompanyId = actor.companyAdmin?.company?.id;
    } else if (actor.role === UserRole.business_instructors) {
      // Case B: business instructor creates course
      resolvedInstructorId = actor.id;
      resolvedCompanyId = actor.businessInstructor?.company?.id;

      if (!actor.businessInstructor?.company?.author?.userId) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'Company admin not linked with this business instructor.',
        );
      }

      // assign company admin (author)
      const companyAdminUser = await prisma.user.findFirst({
        where: {
          id: actor.businessInstructor.company.author.userId,
          role: UserRole.company_admin,
          status: UserStatus.active,
          isDeleted: false,
        },
      });
      if (!companyAdminUser)
        throw new ApiError(httpStatus.NOT_FOUND, 'Company admin not found!');
      resolvedAuthorId = companyAdminUser.id;
      companyAuthor = companyAdminUser;
    } else {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Only company admin or business instructor can create company courses.',
      );
    }

    // Validate company
    company = await prisma.company.findFirst({
      where: { id: resolvedCompanyId, isDeleted: false },
      include: { author: { select: { user: { select: { id: true } } } } },
    });
    if (!company)
      throw new ApiError(httpStatus.NOT_FOUND, 'Company not found!');
    if (!company.isActive)
      throw new ApiError(httpStatus.BAD_REQUEST, 'Company is not active!');
  }

  // 🔹 Validate instructor user
  const instructorUser = await prisma.user.findFirst({
    where: {
      id: resolvedInstructorId,
      status: UserStatus.active,
      isDeleted: false,
    },
  });
  if (!instructorUser)
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Instructor not found or inactive!',
    );

  if (
    ![UserRole.instructor, UserRole.business_instructors].includes(
      // @ts-ignore
      instructorUser.role,
    )
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'InstructorId must belong to an instructor.',
    );
  }

  // 🔹 Upload thumbnail
  if (file) {
    payload.thumbnail = (await uploadToS3({
      file,
      fileName: `images/courses/thumbnail/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  // 🔹 Set flags
  if (typeof payload.price === 'number' && payload.price === 0) {
    payload.isFreeCourse = true;
  }

  // Auto approve if superAdmin author
  const authorUser = await prisma.user.findUnique({
    where: { id: resolvedAuthorId },
  });

  // 🔹 Create transaction
  const result = await prisma.$transaction(async tx => {
    const newCourse = await tx.course.create({
      data: {
        ...payload,
        authorId: resolvedAuthorId as string,
        instructorId: resolvedInstructorId as string,
        companyId: resolvedCompanyId ?? null,
      },
    });

    // Update company counters
    if (company) {
      await tx.company.update({
        where: { id: company.id },
        data: { courses: { increment: 1 } },
      });
    }

    // Update instructor counters
    if (resolvedInstructorId) {
      const businessInstructor = await tx.businessInstructor.findUnique({
        where: { userId: resolvedInstructorId },
      });
      if (businessInstructor) {
        await tx.businessInstructor.update({
          where: { id: businessInstructor.id },
          data: { courses: { increment: 1 } },
        });
      } else {
        const instructorRecord = await tx.instructor.findUnique({
          where: { userId: resolvedInstructorId },
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

  // 🔹 Send notification
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
                data: [
                  { userId: course.instructorId!, role: ChatRole.admin },
                  { userId: course.authorId!, role: ChatRole.admin },
                ],
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
            participants: {
              createMany: {
                data: [
                  { userId: course.authorId!, role: ChatRole.admin },
                  { userId: course.instructorId! },
                ],
              },
            },
          },
        });
      }
    }

    // 4. Send notify to instructor
    await sendNotifYToUser(status, course.instructorId!);

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
  await sendNotifYToUser('deleted', course.instructorId!);

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
