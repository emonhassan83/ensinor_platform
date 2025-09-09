import { Book, BookStatus, Package, Prisma, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IShop, IShopFilterRequest } from './shop.interface';
import { shopSearchAbleFields } from './shop.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { uploadToS3 } from '../../utils/s3';
import { UploadedFiles } from '../../interfaces/common.interface';
import httpStatus from 'http-status';

const insertIntoDB = async (payload: IShop, files: any) => {
  const { authorId } = payload;

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

  const result = await prisma.book.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Shop book creation failed!');
  }
  return result;
};

const getAllFromDB = async (
  params: IShopFilterRequest,
  options: IPaginationOptions,
  userId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.BookWhereInput[] = [
    { authorId: userId, isDeleted: false },
  ];

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

  const result = await prisma.book.findMany({
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

  const total = await prisma.book.count({
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

const getByIdFromDB = async (id: string): Promise<Book | null> => {
  const result = await prisma.book.findUnique({
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
    },
  });

  if (!result || result?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Book not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IShop>,
  files: any,
): Promise<Book> => {
  const book = await prisma.book.findUnique({
    where: { id },
  });
  if (!book || book?.isDeleted) {
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
    where: { id },
  });
  if (!book || book?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Book not found!');
  }

  const result = await prisma.book.update({
    where: { id },
    data: { status },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Shop book not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<Book> => {
  const book = await prisma.book.findUniqueOrThrow({
    where: { id },
  });
  if (!book || book?.isDeleted) {
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

  return result;
};

export const ShopService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  changeStatusIntoDB,
  deleteFromDB,
};
