import {
  Event,
  PlatformType,
  Prisma,
  SubscriptionStatus,
  SubscriptionType,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IEvent, IEventFilterRequest } from './event.interface';
import { eventSearchAbleFields } from './event.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { uploadToS3 } from '../../utils/s3';
import httpStatus from 'http-status';
import { isValid, parse, parseISO } from 'date-fns';

const parseEventDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;

  const clean = dateStr.trim();

  // 1️⃣ ISO format (2025-12-05)
  let parsed = parseISO(clean);
  if (isValid(parsed)) return parsed;

  // 2️⃣ DD/MM/YYYY (20/10/2025)
  parsed = parse(clean, 'dd/MM/yyyy', new Date());
  if (isValid(parsed)) return parsed;

  // 3️⃣ MM/DD/YYYY (8/18/2027) ← THIS WAS MISSING
  parsed = parse(clean, 'MM/dd/yyyy', new Date());
  if (isValid(parsed)) return parsed;

  return null;
};

const insertIntoDB = async (payload: IEvent, file: any) => {
  const { authorId, platform } = payload;
  
  // 1️⃣ Validate author user
  const author = await prisma.user.findFirst({
    where: {
      id: authorId,
      status: UserStatus.active,
      isDeleted: false,
    },
    include: {
      instructor: true,
      subscription: true,
      companyAdmin: {
        select: { company: { select: { id: true, isActive: true } } },
      },
      businessInstructor: {
        select: { company: { select: { id: true, isActive: true } } },
      },
    },
  });
  if (!author) throw new ApiError(httpStatus.NOT_FOUND, 'Author not found!');

  /* =====================================================
     🔐 INSTRUCTOR SUBSCRIPTION CHECK
  ===================================================== */
  const isInstructor =
    author.role === UserRole.instructor || Boolean(author.instructor);

  if (isInstructor) {
    const activeSubscription = author.subscription.find(
      sub =>
        sub.status === SubscriptionStatus.active &&
        !sub.isDeleted &&
        !sub.isExpired &&
        new Date(sub.expiredAt) > new Date(),
    );

    if (!activeSubscription) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'You must have an active subscription to create an event.',
      );
    }

    if (activeSubscription.type === SubscriptionType.standard) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Event creation is not allowed for standard subscriptions.',
      );
    }
  }

  // 2️⃣ Platform = company → validate company & company admin
  let company: any = null;
  let companyAuthor: any = null;

  if (platform === PlatformType.company) {
    if (
      ![UserRole.company_admin, UserRole.business_instructors].includes(
        author.role as any,
      )
    ) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Only company admin or business instructor can add shop data in company platform!',
      );
    }

    payload.companyId =
      author.role === UserRole.company_admin
        ? author.companyAdmin?.company!.id
        : author.businessInstructor?.company!.id;

    company = await prisma.company.findFirst({
      where: { id: payload.companyId, isDeleted: false },
      include: {
        author: { select: { user: { select: { id: true } } } },
      },
    });

    if (!company)
      throw new ApiError(httpStatus.NOT_FOUND, 'Company not found!');
    if (!company.isActive)
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Your company is not active now!',
      );

    companyAuthor = await prisma.user.findFirst({
      where: {
        id: company.author.user.id,
        role: UserRole.company_admin,
        status: UserStatus.active,
        isDeleted: false,
      },
    });
    if (!companyAuthor)
      throw new ApiError(httpStatus.NOT_FOUND, 'Company admin not found!');
  }

  // 3️⃣ Upload image
  if (file) {
    payload.thumbnail = (await uploadToS3({
      file,
      fileName: `images/event/thumbnail/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  // 4️⃣ Create record
  const result = await prisma.event.create({
    data: payload,
  });

  if (!result)
    throw new ApiError(httpStatus.BAD_REQUEST, 'Event creation failed!');

  return result;
};

const getTrendingEventsFromDB = async () => {
  const andConditions: Prisma.EventWhereInput[] = [{ isDeleted: false }];

  const whereConditions: Prisma.EventWhereInput = { AND: andConditions };

  // 1️⃣ Fetch events
  const events = await prisma.event.findMany({
    where: whereConditions,
    orderBy: { registered: 'desc' },
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
      author: {
        select: { name: true },
      },
    },
  });

  const today = new Date();

  // 2️⃣ Filter only upcoming events (date > today)
  const futureEvents = events.filter(event => {
    const parsedDate = parseEventDate(event.date);
    return parsedDate && parsedDate > today;
  });

  // 3️⃣ Take top 4 trending upcoming events
  const trending = futureEvents.slice(0, 4);

  // 4️⃣ Map + include discount logic
  return trending.map(event => {
    const coupon = event.coupon?.[0];
    const promo = event.promoCode?.[0];

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
      discount > 0 ? event.price - (event.price * discount) / 100 : event.price;

    const { coupon: _c, promoCode: _p, ...rest } = event;
    return {
      ...rest,
      couponCode,
      promoCode,
      expiry,
      discount,
      discountPrice,
    };
  });
};

const getAllFromDB = async (
  params: IEventFilterRequest,
  options: IPaginationOptions,
  filterBy?: { companyId?: string; authorId?: string },
) => {
  const { page, limit } = paginationHelpers.calculatePagination(options);
  const { searchTerm, status, ...filterData } = params;

  const andConditions: Prisma.EventWhereInput[] = [{ isDeleted: false }];

  if (filterBy?.authorId) andConditions.push({ authorId: filterBy.authorId });
  if (filterBy?.companyId)
    andConditions.push({ companyId: filterBy.companyId });

  if (searchTerm) {
    andConditions.push({
      OR: eventSearchAbleFields.map(field => ({
        [field]: { contains: searchTerm, mode: 'insensitive' },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: { equals: (filterData as any)[key] },
      })),
    });
  }

  const whereConditions: Prisma.EventWhereInput = { AND: andConditions };

  const events = await prisma.event.findMany({
    where: whereConditions,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: 'desc' },
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
      author: {
        select: { name: true },
      },
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formattedEvents = events.map(event => {
    const coupon = event.coupon?.[0];
    const promo = event.promoCode?.[0];

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
      discount > 0 ? event.price - (event.price * discount) / 100 : event.price;

    const eventDate = parseEventDate(event.date);
    const generatedStatus =
      eventDate && eventDate > today ? 'upcoming' : 'completed';

    const { coupon: _c, promoCode: _p, ...rest } = event;
    return {
      ...rest,
      couponCode,
      promoCode,
      expiry,
      discount,
      discountPrice,
      status: generatedStatus,
    };
  });

  const filteredEvents = status
    ? formattedEvents.filter(
        e => e.status.toLowerCase() === status.toLowerCase().trim(),
      )
    : formattedEvents;

  const total = filteredEvents.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

  return {
    meta: { page, limit, total },
    data: paginatedEvents,
  };
};

const eventFilterData = async () => {
  const andConditions: Prisma.EventWhereInput[] = [{ isDeleted: false }];

  const whereConditions: Prisma.EventWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.event.groupBy({
    by: ['category'],
    where: whereConditions,
    _count: { category: true },
    orderBy: {
      category: 'asc', // alphabetically
    },
  });

  // Format result: unique categories + their counts
  const categories = result.map(item => ({
    name: item.category,
    count: item._count.category,
  }));

  // === Languages ===
  const languages = await prisma.event.groupBy({
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
    categories,
    languages: formattedLanguages,
  };
};

const getByIdFromDB = async (id: string) => {
  const event = await prisma.event.findUnique({
    where: { id, isDeleted: false },
    include: {
      author: {
        select: { id: true, name: true, email: true, photoUrl: true },
      },
      eventSchedule: true,
      eventSpeaker: true,
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

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Event not found!');
  }

  const coupon = event.coupon?.[0];
  const promo = event.promoCode?.[0];

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
    discount > 0 ? event.price - (event.price * discount) / 100 : event.price;

  // ✅ Add status
  const parsedDate = parseEventDate(event.date);
  const status =
    parsedDate && parsedDate > new Date() ? 'upcoming' : 'completed';

  const { coupon: _c, promoCode: _p, ...rest } = event;
  return {
    ...rest,
    couponCode,
    promoCode,
    expiry,
    discount,
    discountPrice,
    status,
  };
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IEvent>,
  file: any,
): Promise<Event> => {
  const event = await prisma.event.findUnique({
    where: { id, isDeleted: false },
  });
  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event not found!');
  }

  // upload file here
  if (file) {
    payload.thumbnail = (await uploadToS3({
      file,
      fileName: `images/event/thumbnail/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await prisma.event.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<Event> => {
  const event = await prisma.event.findUniqueOrThrow({
    where: { id, isDeleted: false },
  });
  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event not found!');
  }

  const result = await prisma.event.update({
    where: { id },
    data: {
      isDeleted: true,
    },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event not deleted!');
  }

  return result;
};

export const EventService = {
  insertIntoDB,
  getAllFromDB,
  getTrendingEventsFromDB,
  eventFilterData,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
