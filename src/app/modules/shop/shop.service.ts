import {
  Book,
  BookStatus,
  PlatformType,
  Prisma,
  SubscriptionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IShop, IShopFilterRequest } from './shop.interface';
import { shopSearchAbleFields } from './shop.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { uploadToS3 } from '../../utils/s3';
import { UploadedFiles } from '../../interfaces/common.interface';
import httpStatus from 'http-status';
import { sendNotifYToAdmin, sendNotifYToUser } from './shop.utils';
import { findAdmin } from '../../utils/findAdmin';

const insertIntoDB = async (payload: IShop, files: any) => {
  const { authorId, platform } = payload;

  // 🔹 1. Validate author user
  const author = await prisma.user.findFirst({
    where: {
      id: authorId,
      status: UserStatus.active,
      isDeleted: false,
    },
    include: {
      companyAdmin: { select: { company: { select: { id: true } } } },
      businessInstructor: { select: { company: { select: { id: true } } } },
      subscription: true,
    },
  });
  if (!author) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Author not found!');
  }

  let company: any = null;
  let companyAuthor: any = null;

  // 2️. If author is an instructor → check subscription
  if (author.role === UserRole.instructor) {
    const activeSubscription = author.subscription.find(
      sub =>
        sub.status === SubscriptionStatus.active &&
        sub.isExpired === false &&
        sub.isDeleted === false &&
        new Date(sub.expiredAt) > new Date(),
    );
    if (!activeSubscription) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'You need an active subscription to add shop/book items.',
      );
    }
  }

  // 🔹 3. If platform = company → validate company & company admin
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

    // 4. Validate company
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

  // 5. upload thumbnail and file
  if (files) {
    const { thumbnail, file } = files as UploadedFiles;

    if (thumbnail?.length) {
      const uploadedThumbnail = await uploadToS3({
        file: thumbnail[0],
        fileName: `images/shop/thumbnail/${Math.floor(100000 + Math.random() * 900000)}`,
      });
      payload.thumbnail = uploadedThumbnail as string;
    }

    if (file?.length) {
      const uploadedFile = await uploadToS3({
        file: file[0],
        fileName: `images/shop/files/${Math.floor(100000 + Math.random() * 900000)}`,
      });
      payload.file = uploadedFile as string;
    }
  }

  //🔹 6. Create record
  const result = await prisma.book.create({
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Shop book creation failed!');
  }

  // 🔹 7. Send notification
  if (platform === PlatformType.admin) {
    const admin = await findAdmin();
    if (!admin) throw new Error('Super admin not found!');
    await sendNotifYToAdmin(author, admin);
  } else if (platform === PlatformType.company) {
    await sendNotifYToAdmin(author, companyAuthor);
  }

  return result;
};

const getTrendingBooks = async () => {
  const andConditions: Prisma.BookWhereInput[] = [{ isDeleted: false }];
  const whereConditions: Prisma.BookWhereInput = {
    AND: andConditions,
  };

  const books = await prisma.book.findMany({
    where: whereConditions,
    take: 4,
    orderBy: {
      sales: 'desc',
    },
    include: {
      author: { select: { name: true } },
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

  const result = books.map(book => {
    const coupon = book.coupon?.[0];
    const promo = book.promoCode?.[0];

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
      discount > 0 ? book.price - (book.price * discount) / 100 : book.price;

    const { coupon: _c, promoCode: _p, ...rest } = book;
    return { ...rest, couponCode, promoCode, expiry, discount, discountPrice };
  });

  return result;
};

const getAllFromDB = async (
  params: IShopFilterRequest,
  options: IPaginationOptions,
  filterBy?: { authorId?: string; companyId?: string },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.BookWhereInput[] = [{ isDeleted: false }];

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
      OR: shopSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.BookWhereInput = {
    AND: andConditions,
  };

  const books = await prisma.book.findMany({
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
      author: { select: { name: true } },
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

  const formattedBooks = books.map(book => {
    const coupon = book.coupon?.[0];
    const promo = book.promoCode?.[0];

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
      discount > 0 ? book.price - (book.price * discount) / 100 : book.price;

    const { coupon: _c, promoCode: _p, ...rest } = book;
    return {
      ...rest,
      salesAmount: book.sales * book.price,
      couponCode,
      promoCode,
      expiry,
      discount,
      discountPrice,
    };
  });

  const total = await prisma.book.count({
    where: whereConditions,
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: formattedBooks,
  };
};

const getAllCategoryFromDB = async () => {
  const whereConditions: Prisma.BookWhereInput = {
    status: BookStatus.published,
    isDeleted: false,
  };

  // 📚 1️⃣ Get unique categories + count
  const categoryResult = await prisma.book.groupBy({
    by: ['category'],
    where: whereConditions,
    _count: { category: true },
    orderBy: { category: 'asc' },
  });

  const categories = categoryResult.map(item => ({
    name: item.category,
    count: item._count.category,
  }));

   // 🌐 2️⃣ Get unique languages + count (same logic as category)
  const languageResult = await prisma.book.groupBy({
    by: ['language'],
    where: whereConditions,
    _count: { language: true },
    orderBy: { language: 'asc' },
  });

  const languages = languageResult.map(item => ({
    name: item.language,
    count: item._count.language,
  }));

  return {
    categories,
    languages,
  };
};

const getByIdFromDB = async (id: string) => {
  const book = await prisma.book.findUnique({
    where: { id, isDeleted: false },
    include: {
      author: { select: { id: true, name: true, email: true, photoUrl: true } },
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

  if (!book) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Book not found!');
  }

  const coupon = book.coupon?.[0];
  const promo = book.promoCode?.[0];

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
    discount > 0 ? book.price - (book.price * discount) / 100 : book.price;

  const { coupon: _c, promoCode: _p, ...rest } = book;

  return { ...rest, couponCode, promoCode, expiry, discount, discountPrice };
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IShop>,
  files: any,
): Promise<Book> => {
  const book = await prisma.book.findUnique({
    where: { id, isDeleted: false },
  });
  if (!book) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Book not found!');
  }

  // upload thumbnail and file
  if (files) {
    const { thumbnail, file } = files as UploadedFiles;

    if (thumbnail?.length) {
      const uploadedThumbnail = await uploadToS3({
        file: thumbnail[0],
        fileName: `images/shop/thumbnail/${Math.floor(100000 + Math.random() * 900000)}`,
      });
      payload.thumbnail = uploadedThumbnail as string;
    }

    if (file?.length) {
      const uploadedFile = await uploadToS3({
        file: file[0],
        fileName: `images/shop/files/${Math.floor(100000 + Math.random() * 900000)}`,
      });
      payload.file = uploadedFile as string;
    }
  }

  const result = await prisma.book.update({
    where: { id },
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Shop book not updated!');
  }
  return result;
};

const changeStatusIntoDB = async (
  id: string,
  payload: { status: BookStatus },
): Promise<Book> => {
  const { status } = payload;

  const book = await prisma.book.findUnique({
    where: { id, isDeleted: false },
  });
  if (!book) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Book not found!');
  }

  const result = await prisma.book.update({
    where: { id },
    data: { status },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Shop book not updated!');
  }

  // here sent notification to author
  await sendNotifYToUser(status, book.authorId);

  return result;
};

const deleteFromDB = async (id: string): Promise<Book> => {
  const book = await prisma.book.findUniqueOrThrow({
    where: { id, isDeleted: false },
  });
  if (!book) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Shop book not found!');
  }

  const result = await prisma.book.update({
    where: { id },
    data: {
      isDeleted: true,
    },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Shop book not deleted!');
  }

  // sent notify to author
  await sendNotifYToUser('deleted', book.authorId);

  return result;
};

export const ShopService = {
  insertIntoDB,
  getTrendingBooks,
  getAllFromDB,
  getAllCategoryFromDB,
  getByIdFromDB,
  updateIntoDB,
  changeStatusIntoDB,
  deleteFromDB,
};
