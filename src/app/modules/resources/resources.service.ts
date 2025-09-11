import {
  Prisma,
  Resource,
  ResourceModelType,
  UserStatus,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IResource, IResourceFilterRequest } from './resources.interface';
import { resourceSearchAbleFields } from './resources.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';
import { uploadToS3 } from '../../utils/s3';

const insertIntoDB = async (payload: IResource, file: any) => {
  const { authorId, courseId, bookId, eventId, modelType } = payload;

  // 1. Validate author
  const user = await prisma.user.findFirst({
    where: {
      id: authorId,
      isDeleted: false,
      status: UserStatus.active,
    },
  });
  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Author not found!');
  }

  // 2. Validate by modelType
  switch (modelType) {
    case ResourceModelType.course: {
      if (!courseId) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'CourseId is required for course resource!',
        );
      }
      const course = await prisma.course.findFirst({
        where: { id: courseId, authorId, isDeleted: false },
      });
      if (!course) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Course not found!');
      }
      break;
    }
    case ResourceModelType.book: {
      if (!bookId) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'BookId is required for book resource!',
        );
      }
      const book = await prisma.book.findFirst({
        where: { id: bookId, authorId, isDeleted: false },
      });
      if (!book) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Book not found!');
      }
      break;
    }
    case ResourceModelType.event: {
      if (!eventId) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          'EventId is required for event resource!',
        );
      }
      const event = await prisma.event.findFirst({
        where: { id: eventId, authorId, isDeleted: false },
      });
      if (!event) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Event not found!');
      }
      break;
    }
    default:
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid modelType provided!');
  }

  // 3. Upload file
  if (file) {
    payload.file = (await uploadToS3({
      file,
      fileName: `images/resource/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  // 4. Create Resource
  const result = await prisma.resource.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Resource creation failed!');
  }
  return result;
};

const getAllFromDB = async (
  params: IResourceFilterRequest,
  options: IPaginationOptions,
  filterBy: {
    authorId?: string;
    courseId?: string;
    bookId?: string;
    eventId?: string;
  },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.ResourceWhereInput[] = [];
  // Filter either by authorId, courseId, bookId or eventId
  if (filterBy.authorId) {
    andConditions.push({ authorId: filterBy.authorId });
  }
  if (filterBy.courseId) {
    andConditions.push({ courseId: filterBy.courseId });
  }
  if (filterBy.bookId) {
    andConditions.push({ bookId: filterBy.bookId });
  }
  if (filterBy.eventId) {
    andConditions.push({ eventId: filterBy.eventId });
  }

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: resourceSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.ResourceWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.resource.findMany({
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
      course: {
        select: {
          title: true,
        },
      },
      book: {
        select: {
          title: true,
        },
      },
      event: {
        select: {
          title: true,
        },
      },
    },
  });

  const total = await prisma.resource.count({
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

const getByIdFromDB = async (id: string): Promise<Resource | null> => {
  const result = await prisma.resource.findUnique({
    where: { id },
    include: {
      course: true,
      book: true,
      event: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Resource not found!');
  }
  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IResource>,
  file: any,
): Promise<Resource> => {
  const resource = await prisma.resource.findUnique({
    where: { id },
  });
  if (!resource) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Resource not found!');
  }

  // Upload file
  if (file) {
    payload.file = (await uploadToS3({
      file,
      fileName: `images/resource/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await prisma.resource.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Resource not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<Resource> => {
  const resource = await prisma.resource.findUniqueOrThrow({
    where: { id },
  });
  if (!resource) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Resource not found!');
  }

  const result = await prisma.resource.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Resource not deleted!');
  }

  return result;
};

export const ResourceService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
