import {
  ChatRole,
  ChatType,
  Company,
  Course,
  CoursesStatus,
  CourseType,
  PlatformType,
  Prisma,
  SubscriptionStatus,
  SubscriptionType,
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
        subscription: {
          where: { isExpired: false, status: SubscriptionStatus.active },
          select: { type: true },
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
      throw new ApiError(httpStatus.NOT_FOUND, 'Your company not found!');
    if (!company.isActive)
      throw new ApiError(httpStatus.BAD_REQUEST, 'Your company is not active!');

    // 🔹 Check company subscription
    const activeSubscription = actor.subscription[0];
    if (!activeSubscription) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'No active subscription found for this company!',
      );
    }

    const { type: subscriptionType } = activeSubscription;

    // 🔹 Course upload limits by subscription type
    const currentCourses = company.courses;
    if (
      (subscriptionType === SubscriptionType.ngo && currentCourses >= 5) ||
      (subscriptionType === SubscriptionType.sme && currentCourses >= 15)
    ) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Your current subscription (${subscriptionType}) allows only ${
          subscriptionType === SubscriptionType.ngo ? 5 : 15
        } total courses. You’ve already uploaded ${currentCourses}. Upgrade to upload more.`,
      );
    }
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

  const courses = await prisma.course.findMany({
    where: whereConditions,
    take: 4,
    orderBy: {
      enrollments: 'desc',
    },
    include: {
      coupon: {
        where: { isActive: true, expireAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { code: true, discount: true, expireAt: true },
      },
      promoCode: {
        where: { isActive: true, expireAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { code: true, discount: true, expireAt: true },
      },
    },
  });

  // Map to include coupon/promo fields
  const result = courses.map(course => {
    const coupon = course.coupon?.[0];
    const promo = course.promoCode?.[0];

    let discount = 0;
    let couponCode = null;
    let promoCode = null;
    let expiry = null;

    if (coupon) {
      discount = coupon.discount;
      couponCode = coupon.code;
      expiry = coupon.expireAt;
    } else if (promo) {
      discount = promo.discount;
      promoCode = promo.code;
      expiry = promo.expireAt;
    }

    const discountPrice =
      discount > 0
        ? course.price - (course.price * discount) / 100
        : course.price;

    const { coupon: _c, promoCode: _p, ...rest } = course;

    return {
      ...rest,
      couponCode,
      promoCode,
      expiry,
      discount,
      discountPrice,
    };
  });

  return result;
};

const getCombineCoursesFromDB = async (
  params: ICourseFilterRequest,
  options: IPaginationOptions,
  filterBy?: { userId?: string; authorId?: string },
) => {
  const { page, limit } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  // ====== WHERE CONDITIONS ======
  const andConditions: Prisma.CourseWhereInput[] = [
    {
      isDeleted: false,
      status: CoursesStatus.approved,
      type: CourseType.external,
    },
  ];
  const bundleConditions: Prisma.CourseBundleWhereInput[] = [
    { isDeleted: false },
  ];

  // --- Filter by authorId ---
  if (filterBy?.authorId) {
    andConditions.push({ authorId: filterBy.authorId });
    bundleConditions.push({ authorId: filterBy.authorId });
  }

  // --- Search filter ---
  if (searchTerm) {
    andConditions.push({
      OR: courseSearchAbleFields.map(field => ({
        [field]: { contains: searchTerm, mode: 'insensitive' },
      })),
    });
    bundleConditions.push({
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { category: { contains: searchTerm, mode: 'insensitive' } },
      ],
    });
  }

  // --- Dynamic filters ---
  if (Object.keys(filterData).length > 0) {
    const extraFilters = {
      AND: Object.keys(filterData).map(key => ({
        [key]: { equals: (filterData as any)[key] },
      })),
    };
    andConditions.push(extraFilters);
    bundleConditions.push(extraFilters);
  }

  const whereCourse: Prisma.CourseWhereInput = { AND: andConditions };
  const whereBundle: Prisma.CourseBundleWhereInput = { AND: bundleConditions };

  // ====== FETCH DATA ======
  const [courses, bundles] = await Promise.all([
    prisma.course.findMany({
      where: whereCourse,
      orderBy:
        options.sortBy && options.sortOrder
          ? { [options.sortBy]: options.sortOrder }
          : { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        category: true,
        description: true,
        thumbnail: true,
        price: true,
        isFreeCourse: true,
        level: true,
        language: true,
        avgRating: true,
        ratingCount: true,
        lectures: true,
        duration: true,
        createdAt: true,
        coupon: {
          where: { isActive: true, expireAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { code: true, discount: true, expireAt: true },
        },
        promoCode: {
          where: { isActive: true, expireAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { code: true, discount: true, expireAt: true },
        },
      },
    }),
    prisma.courseBundle.findMany({
      where: whereBundle,
      orderBy:
        options.sortBy && options.sortOrder
          ? { [options.sortBy]: options.sortOrder }
          : { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        category: true,
        description: true,
        thumbnail: true,
        price: true,
        isFreeCourse: true,
        level: true,
        language: true,
        avgRating: true,
        ratingCount: true,
        lectures: true,
        duration: true,
        createdAt: true,
      },
    }),
  ]);

  // ====== MERGE + ADD COUPON/PROMO ======
  const combined = [
    ...courses.map(c => {
      const coupon = c.coupon?.[0];
      const promo = c.promoCode?.[0];

      let couponCode = null;
      let promoCode = null;
      let discount = 0;
      let expiry = null;

      if (coupon) {
        couponCode = coupon.code;
        discount = coupon.discount;
        expiry = coupon.expireAt;
      } else if (promo) {
        promoCode = promo.code;
        discount = promo.discount;
        expiry = promo.expireAt;
      }

      const discountPrice =
        discount > 0 ? c.price - (c.price * discount) / 100 : c.price;

      return {
        id: c.id,
        title: c.title,
        category: c.category,
        description: c.description,
        thumbnail: c.thumbnail,
        price: c.price,
        isFreeCourse: c.isFreeCourse,
        level: c.level,
        language: c.language,
        avgRating: c.avgRating,
        ratingCount: c.ratingCount,
        lectures: c.lectures,
        duration: c.duration,
        createdAt: c.createdAt,
        type: 'course',
        couponCode,
        promoCode,
        expiry,
        discount,
        discountPrice,
      };
    }),
    ...bundles.map(b => ({
      ...b,
      type: 'bundle',
      couponCode: null,
      promoCode: null,
      expiry: null,
      discount: 0,
      discountPrice: b.price,
    })),
  ];

  // ====== SORT ======
  const sortKey = options.sortBy || 'createdAt';
  combined.sort((a, b) => {
    const order = options.sortOrder === 'asc' ? 1 : -1;
    if ((a as any)[sortKey] > (b as any)[sortKey]) return order;
    if ((a as any)[sortKey] < (b as any)[sortKey]) return -order;
    return 0;
  });

  // ====== PAGINATION ======
  const total = combined.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginated = combined.slice(start, end);

  // ====== Wishlist Integration ======
  let wishlistIds: Set<string> = new Set();
  if (filterBy?.userId) {
    const wishlists = await prisma.wishlist.findMany({
      where: {
        userId: filterBy.userId,
        OR: [
          { courseId: { in: courses.map(c => c.id) } },
          { courseBundleId: { in: bundles.map(b => b.id) } },
        ],
      },
      select: { courseId: true, courseBundleId: true },
    });
    wishlistIds = new Set(wishlists.map(w => w.courseId || w.courseBundleId!));
  }

  const finalData = paginated.map(item => ({
    ...item,
    isWishlist: wishlistIds.has(item.id),
  }));

  return {
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
    data: finalData,
  };
};

const getAllFromDB = async (
  params: ICourseFilterRequest,
  options: IPaginationOptions,
  filterBy: { authorId?: string; companyId?: string },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  // ====== WHERE CONDITIONS ======
  const andConditions: Prisma.CourseWhereInput[] = [{ isDeleted: false }];

  // Filter by authorId or companyId
  if (filterBy.authorId) andConditions.push({ authorId: filterBy.authorId });
  if (filterBy.companyId) andConditions.push({ companyId: filterBy.companyId });

  // Search filter
  if (searchTerm) {
    andConditions.push({
      OR: courseSearchAbleFields.map(field => ({
        [field]: { contains: searchTerm, mode: 'insensitive' },
      })),
    });
  }

  // Additional filters
  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: { equals: (filterData as any)[key] },
      })),
    });
  }

  const whereConditions: Prisma.CourseWhereInput = { AND: andConditions };

  // ====== FETCH COURSES WITH FIRST ACTIVE COUPON/PROMO ======
  const courses = await prisma.course.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { avgRating: 'desc' },
    select: {
      id: true,
      authorId: true,
      companyId: true,
      title: true,
      shortDescription: true,
      platform: true,
      type: true,
      category: true,
      level: true,
      language: true,
      deadline: true,
      price: true,
      description: true,
      thumbnail: true,
      lectures: true,
      duration: true,
      hasCertificate: true,
      isFreeCourse: true,
      enrollments: true,
      totalCompleted: true,
      status: true,
      avgRating: true,
      ratingCount: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
      coupon: {
        where: { isActive: true, expireAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { code: true, discount: true, expireAt: true },
      },
      promoCode: {
        where: { isActive: true, expireAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { code: true, discount: true, expireAt: true },
      },
    },
  });

  // ====== FORMAT RESULTS ======
  const result = courses.map(course => {
    const coupon = course.coupon?.[0];
    const promo = course.promoCode?.[0];

    // Choose coupon first; if no coupon, use promo
    const discountData = coupon || promo;
    const discount = discountData?.discount ?? 0;
    const couponCode = coupon ? coupon.code : null;
    const promoCode = !coupon && promo ? promo.code : null;
    const expiry = discountData?.expireAt ?? null;

    const discountPrice =
      discount > 0
        ? course.price - (course.price * discount) / 100
        : course.price;

    // Exclude original arrays
    const { coupon: _, promoCode: __, ...rest } = course;

    return {
      ...rest,
      couponCode,
      promoCode,
      expiry,
      discount,
      discountPrice,
    };
  });

  // ====== TOTAL COUNT ======
  const total = await prisma.course.count({ where: whereConditions });

  return {
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
    data: result,
  };
};

const getAllFilterDataFromDB = async () => {
  // === Course filters ===
  const courseWhere: Prisma.CourseWhereInput = {
    status: CoursesStatus.approved,
    isDeleted: false,
  };

  // === Bundle filters ===
  const bundleWhere: Prisma.CourseBundleWhereInput = {
    isDeleted: false,
  };

  // --- Categories ---
  const courseCategories = await prisma.course.groupBy({
    by: ['category'],
    where: courseWhere,
    _count: { category: true },
  });

  const bundleCategories = await prisma.courseBundle.groupBy({
    by: ['category'],
    where: bundleWhere,
    _count: { category: true },
  });

  const categoryMap: Record<string, number> = {};
  [...courseCategories, ...bundleCategories].forEach(item => {
    categoryMap[item.category] =
      (categoryMap[item.category] || 0) + item._count.category;
  });

  const formattedCategories = Object.entries(categoryMap).map(
    ([name, count]) => ({ name, count }),
  );

  // --- Price (free vs paid) ---
  const coursePrice = await prisma.course.groupBy({
    by: ['isFreeCourse'],
    where: courseWhere,
    _count: { isFreeCourse: true },
  });

  const bundlePrice = await prisma.courseBundle.groupBy({
    by: ['isFreeCourse'],
    where: bundleWhere,
    _count: { isFreeCourse: true },
  });

  const priceMap: { free: number; paid: number } = { free: 0, paid: 0 };
  [...coursePrice, ...bundlePrice].forEach(item => {
    if (item.isFreeCourse) {
      priceMap.free += item._count.isFreeCourse;
    } else {
      priceMap.paid += item._count.isFreeCourse;
    }
  });

  // --- Levels ---
  const courseLevels = await prisma.course.groupBy({
    by: ['level'],
    where: courseWhere,
    _count: { level: true },
  });

  const bundleLevels = await prisma.courseBundle.groupBy({
    by: ['level'],
    where: bundleWhere,
    _count: { level: true },
  });

  const levelMap: Record<string, number> = {};
  [...courseLevels, ...bundleLevels].forEach(item => {
    levelMap[item.level] = (levelMap[item.level] || 0) + item._count.level;
  });

  const formattedLevels = Object.entries(levelMap).map(([name, count]) => ({
    name,
    count,
  }));

  // --- Languages ---
  const courseLanguages = await prisma.course.groupBy({
    by: ['language'],
    where: courseWhere,
    _count: { language: true },
  });

  const bundleLanguages = await prisma.courseBundle.groupBy({
    by: ['language'],
    where: bundleWhere,
    _count: { language: true },
  });

  const langMap: Record<string, number> = {};
  [...courseLanguages, ...bundleLanguages].forEach(item => {
    langMap[item.language] =
      (langMap[item.language] || 0) + item._count.language;
  });

  const formattedLanguages = Object.entries(langMap).map(([name, count]) => ({
    name,
    count,
  }));

  return {
    data: {
      categories: formattedCategories,
      price: priceMap,
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
      coupon: {
        where: { isActive: true, expireAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { code: true, discount: true, expireAt: true },
      },
      promoCode: {
        where: { isActive: true, expireAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { code: true, discount: true, expireAt: true },
      },
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Course not found!');
  }

  // ====== Flatten coupon/promo ======
  const coupon = result.coupon?.[0];
  const promo = result.promoCode?.[0];

  const discountData = coupon || promo;
  const discount = discountData?.discount ?? 0;
  const couponCode = coupon ? coupon.code : null;
  const promoCode = !coupon && promo ? promo.code : null;
  const expiry = discountData?.expireAt ?? null;

  const discountPrice =
    discount > 0
      ? result.price - (result.price * discount) / 100
      : result.price;

  // Remove original arrays
  const { coupon: _, promoCode: __, ...rest } = result;

  return {
    ...rest,
    // @ts-ignore
    couponCode,
    promoCode,
    expiry,
    discount,
    discountPrice,
  };
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

const assignACourseIntoDB = async (
  id: string,
  payload: { authorId: string },
  userId: string,
): Promise<Course> => {
  const { authorId } = payload;

  // --- 1️⃣ Validate Company Admin ---
  const companyAdmin = await prisma.user.findFirst({
    where: {
      id: userId,
      role: UserRole.company_admin,
      status: UserStatus.active,
      isDeleted: false,
    },
  });
  if (!companyAdmin) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Only company admins can assign courses.',
    );
  }

  // --- 2️⃣ Validate Assigned Instructor ---
  const instructor = await prisma.user.findFirst({
    where: {
      id: authorId,
      role: UserRole.business_instructors,
      isDeleted: false,
    },
  });
  if (!instructor) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Assigned instructor not found!',
    );
  }

  const existingCourse = await prisma.course.findFirst({
    where: { id, isDeleted: false },
  });
  if (!existingCourse) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found.');
  }

  // --- 4️⃣ Update the Course Author ---
  const updatedCourse = await prisma.course.update({
    where: { id },
    data: {
      authorId,
      updatedAt: new Date(),
    },
  });

  // sent notification
  await sendNotifYToUser('assign', instructor.id);

  return updatedCourse;
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
  getCombineCoursesFromDB,
  getAllFilterDataFromDB,
  getByIdFromDB,
  updateIntoDB,
  changeStatusIntoDB,
  assignACourseIntoDB,
  deleteFromDB,
};
