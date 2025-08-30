import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import prisma from '../../utils/prisma';
import { IPaginationOptions } from '../../interfaces/pagination';
import { Prisma } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { uploadToS3 } from '../../utils/s3';
import { articleSearchableFields } from './article.constant';
import { IArticle, IArticleFilterRequest } from './article.interface';

const insertIntoDB = async (payload: IArticle, file: any) => {
  // upload to image
  if (file) {
    payload.thumbnail = (await uploadToS3({
      file,
      fileName: `images/articles/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await prisma.article.create({
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Article creation failed!');
  }

  return result;
};

const getAllFromDB = async (
  filters: IArticleFilterRequest,
  options: IPaginationOptions,
) => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.ArticleWhereInput[] = [{ isDeleted: false }];

  if (searchTerm) {
    andConditions.push({
      OR: articleSearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  const whereConditions: Prisma.ArticleWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.article.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: 'desc',
          },
  });
  const total = await prisma.article.count({
    where: whereConditions,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

const getByIdFromDB = async (id: string) => {
  const result = await prisma.article.findUnique({
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

  if (!result || result.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Article not found');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IArticle>,
  file: any,
) => {
  const article = await prisma.article.findUnique({
    where: { id },
  });
  if (!article || article?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Article not found!');
  }

  // upload to image
  if (file) {
    payload.thumbnail = (await uploadToS3({
      file,
      fileName: `images/articles/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await prisma.article.update({
    where: { id },
    data: payload,
  });

  return result;
};

const seenArticleIntoDB = async (articleId: string, userId: string) => {
  // 1. Check if article exists
  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });
  if (!article || article.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Article not found!');
  }

  // 2. Check if user already seen this article
  const alreadySeen = await prisma.usersOnArticles.findUnique({
    where: {
      userId_articleId: { userId, articleId }, // composite PK
    },
  });

  // 3. If already seen, just return article (no update to counter)
  if (alreadySeen) {
    return article;
  }

  // 4. Add entry in join table + increment seen counter in Article
  const [_, updatedArticle] = await prisma.$transaction([
    prisma.usersOnArticles.create({
      data: {
        userId,
        articleId,
      },
    }),
    prisma.article.update({
      where: { id: articleId },
      data: {
        seen: { increment: 1 },
      },
    }),
  ]);

  return updatedArticle;
};


const deleteFromDB = async (id: string) => {
  const article = await prisma.article.findUnique({
    where: { id },
  });
  if (!article || article?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Article not found!');
  }
  
  const result = await prisma.article.update({
    where: { id },
    data: { isDeleted: true },
  });

  if (!result || result?.isDeleted) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Article deletion failed');
  }

  return result;
};

export const ArticleServices = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  seenArticleIntoDB,
  deleteFromDB,
};
