import {
  Event,
  PlatformType,
  Prisma,
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

const insertIntoDB = async (payload: IEvent, file: any) => {
  const { authorId, platform } = payload;

  //🔹 1. Validate author user
  const author = await prisma.user.findFirst({
    where: {
      id: authorId,
      status: UserStatus.active,
      isDeleted: false,
    },
    include: {
      companyAdmin: { select: { company: { select: { id: true } } } },
      businessInstructor: { select: { company: { select: { id: true } } } },
    },
  });
  if (!author) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Author not found!');
  }

  let company: any = null;
  let companyAuthor: any = null;

  // 🔹 2. If platform = company → validate company & company admin
  if (platform === PlatformType.company) {
    if (
      author.role !== UserRole.company_admin &&
      author.role !== UserRole.business_instructors
    ) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Only company admin or business instructor can add shop data in company platform!',
      );
    }

    if (author.role === UserRole.company_admin) {
      payload.companyId = author.companyAdmin?.company!.id;
    }
    if (author.role === UserRole.business_instructors) {
      payload.companyId = author.businessInstructor?.company!.id;
    }

    // Validate company
    company = await prisma.company.findFirst({
      where: { id: payload.companyId, isDeleted: false },
      include: {
        author: {
          select: {
            user: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!company) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Company not found!');
    }
    if (company.isActive === false) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Your company is not active now!',
      );
    }

    companyAuthor = await prisma.user.findFirst({
      where: {
        id: company.author.user.id,
        role: UserRole.company_admin,
        status: UserStatus.active,
        isDeleted: false,
      },
    });
    if (!companyAuthor) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Company admin not found!');
    }
  }

  //3. upload to image
  if (file) {
    payload.thumbnail = (await uploadToS3({
      file,
      fileName: `images/event/thumbnail/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  // 4. create record
  const result = await prisma.event.create({
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Event creation failed!');
  }

  return result;
};

const getTrendingEventsFromDB = async () => {
  const andConditions: Prisma.EventWhereInput[] = [{ isDeleted: false }];

  const whereConditions: Prisma.EventWhereInput = {
    AND: andConditions,
  };

  const events = await prisma.event.findMany({
    where: whereConditions,
    take: 4,
    orderBy: {
      registered: 'desc',
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

  return events.map(event => {
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
    return { ...rest, couponCode, promoCode, expiry, discount, discountPrice };
  });
};

const getAllFromDB = async (
  params: IEventFilterRequest,
  options: IPaginationOptions,
  filterBy?: { companyId?: string; authorId?: string },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.EventWhereInput[] = [{ isDeleted: false }];
  // Filter either by authorId or companyId
  if (filterBy && filterBy.authorId) {
    andConditions.push({ authorId: filterBy.authorId });
  }
  if (filterBy && filterBy.companyId) {
    andConditions.push({ companyId: filterBy.companyId });
  }

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: eventSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.EventWhereInput = {
    AND: andConditions,
  };

  const events = await prisma.event.findMany({
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

    const { coupon: _c, promoCode: _p, ...rest } = event;
    return { ...rest, couponCode, promoCode, expiry, discount, discountPrice };
  });

  const total = await prisma.event.count({ where: whereConditions });

  return {
    meta: { page, limit, total },
    data: formattedEvents,
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
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
        },
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

  const { coupon: _c, promoCode: _p, ...rest } = event;
  return { ...rest, couponCode, promoCode, expiry, discount, discountPrice };
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
