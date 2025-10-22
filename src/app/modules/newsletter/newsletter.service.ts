import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import prisma from '../../utils/prisma';
import { IPaginationOptions } from '../../interfaces/pagination';
import { NewsletterStatus, Prisma } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { newsletterSearchableFields } from './newsletter.constant';
import {
  INewsletter,
  INewsletterFilterRequest,
  ISubscriber,
} from './newsletter.interface';
import emailSender from '../../utils/emailSender';

const subscribeUser = async (payload: ISubscriber) => {
  const { email } = payload;

  const existing = await prisma.newsletterSubscriber.findFirst({
    where: { email },
  });
  if (existing) {
    throw new ApiError(
      httpStatus.CONFLICT,
      'This email is already subscribed!',
    );
  }

  const result = await prisma.newsletterSubscriber.create({
    data: payload,
  });
  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Newsletter subscription creation failed!',
    );
  }

  // ✉️ Send congratulation email
  await emailSender(
    email,
    '🎉 Welcome to Our Newsletter!',
    `
      <div style="font-family:sans-serif; line-height:1.6;">
        <h2 style="color:#2b6cb0;">Welcome to the Family!</h2>
        <p>Hi there,</p>
        <p>Thank you for subscribing to our newsletter. You’ll now receive the latest updates, tips, and offers directly in your inbox.</p>
        <p>We’re thrilled to have you with us! 🎊</p>
        <br/>
        <p>Warm regards,<br/>The Team</p>
      </div>
    `,
  );

  return result;
};

const unsubscribeUser = async (payload: { email: string }) => {
  const { email } = payload;

  const existing = await prisma.newsletterSubscriber.findFirst({
    where: { email },
  });
  if (!existing) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Subscriber not found!');
  }

  const result = await prisma.newsletterSubscriber.delete({
    where: { id: existing.id },
  });
  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Newsletter subscription created failed!',
    );
  }

  // ✉️ Send goodbye email
  await emailSender(
    email,
    'We’re sad to see you go 💔',
    `
      <div style="font-family:sans-serif; line-height:1.6;">
        <h2 style="color:#e53e3e;">Goodbye for now!</h2>
        <p>Hi there,</p>
        <p>You’ve successfully unsubscribed from our newsletter.</p>
        <p>We’re sorry to see you go, but you’re always welcome back anytime.</p>
        <p>If this was a mistake, you can resubscribe again.</p>
        <br/>
        <p>Take care,<br/>The Team</p>
      </div>
    `,
  );

  return result;
};

const getAllSubscribeFromDB = async (
  filters: INewsletterFilterRequest,
  options: IPaginationOptions,
) => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.NewsletterSubscriberWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: newsletterSearchableFields.map(field => ({
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

  const whereConditions: Prisma.NewsletterSubscriberWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.newsletterSubscriber.findMany({
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
  const total = await prisma.newsletterSubscriber.count({
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

const changeStatusIntoDB = async (payload: {
  email: string;
  status: NewsletterStatus;
}) => {
  const { email, status } = payload;
  const newsletter = await prisma.newsletterSubscriber.findFirst({
    where: { email },
  });
  if (!newsletter) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Newsletter subscriber not found!',
    );
  }

  const result = await prisma.newsletterSubscriber.update({
    where: { id: newsletter.id },
    data: { status },
  });

  return result;
};

const insertIntoDB = async (payload: INewsletter) => {
  const result = await prisma.newsletter.create({
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Newsletter creation failed!');
  }

  return result;
};

const getAllFromDB = async (
  filters: INewsletterFilterRequest,
  options: IPaginationOptions,
) => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.NewsletterWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: newsletterSearchableFields.map(field => ({
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

  const whereConditions: Prisma.NewsletterWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.newsletter.findMany({
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
  const total = await prisma.newsletter.count({
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
  const result = await prisma.newsletter.findUnique({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Newsletter not found!');
  }

  return result;
};

const updateIntoDB = async (id: string, payload: Partial<INewsletter>) => {
  const newsletter = await prisma.newsletter.findUnique({
    where: { id },
  });
  if (!newsletter) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Newsletter not found!');
  }

  const result = await prisma.newsletter.update({
    where: { id },
    data: payload,
  });

  return result;
};

const deleteFromDB = async (id: string) => {
  // 1️. Check if the newsletter exists
  const newsletter = await prisma.newsletter.findUnique({
    where: { id },
  });

  if (!newsletter) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Newsletter not found!');
  }

  // 2️. First, delete all related logs (to avoid FK constraint)
  await prisma.newsletterLog.deleteMany({
    where: { newsletterId: id },
  });

  // 3️. Then safely delete the newsletter
  const result = await prisma.newsletter.delete({
    where: { id },
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Newsletter deletion failed!');
  }

  return result;
};

export const NewsletterServices = {
  subscribeUser,
  unsubscribeUser,
  getAllSubscribeFromDB,
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  changeStatusIntoDB,
  deleteFromDB,
};
