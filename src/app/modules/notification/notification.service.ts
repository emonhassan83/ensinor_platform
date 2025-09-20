import httpStatus from 'http-status';
import moment from 'moment';
import ApiError from '../../errors/ApiError';
import { IUserFilterRequest } from '../user/user.interface';
import { IPaginationOptions } from '../../interfaces/pagination';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { Prisma, UserRole } from '@prisma/client';
import { notificationSearchableFields } from './notification.constant';
import prisma from '../../utils/prisma';
import { INotification } from './notification.interface';

const createNotificationIntoDB = async (payload: INotification) => {
  const notification = await prisma.notification.create({
     data: {
      receiverId: payload.receiverId,
      referenceId: payload.referenceId,
      modeType: payload.modeType,
      message: payload.message,
      description: payload?.description ?? '',
    },
  });
  if (!notification) {
    throw new ApiError(httpStatus.CONFLICT, 'Notification not created!');
  }

  //@ts-ignore
  const io = global?.socketio;
  if (io) {
    const ver = 'notification::' + payload?.receiverId;
    io.emit(ver, { ...payload, createdAt: moment().format('YYYY-MM-DD') });
  }

  return notification;
};

const sendGeneralNotificationIntoDB = async (payload: any) => {
  const { message, description, ...othersData } = payload;

  const users = await prisma.user.findMany({
    where: { role: UserRole.student, isDeleted: false },
    select: { id: true },
  });

  const notificationsData = users.map(u => ({
    receiverId: u.id,
    message,
    description,
    ...othersData,
  }));

  // Bulk insert
  await prisma.notification.createMany({ data: notificationsData });

  //@ts-ignore
  const io = global?.socketio;
  if (io) {
    const ver = 'notification::' + payload?.receiver;
    io.emit(ver, { ...payload, createdAt: moment().format('YYYY-MM-DD') });
  }
};

const getAllNotificationFromDB = async (
  filters: IUserFilterRequest,
  options: IPaginationOptions,
  userId: string,
) => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.NotificationWhereInput[] = [
    { receiverId: userId},
  ];

  if (searchTerm) {
    andConditions.push({
      OR: notificationSearchableFields.map(field => ({
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

  const whereConditions: Prisma.NotificationWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.notification.findMany({
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
  const total = await prisma.notification.count({
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

const getANotificationFromDB = async (id: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id },
  });
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found!');
  }

  return notification;
};

const markAsDoneFromDB = async (id: string) => {
  const result = await prisma.notification.updateMany({
    where: { receiverId: id, read: false },
    data: { read: true },
  });
  return result;
};

const deleteANotificationFromDB = async (id: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id },
  });
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found!');
  }

  const result = await prisma.notification.delete({
    where: { id },
  });

  if (!result) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Notification not found and failed to delete!',
    );
  }

  return result;
};

const deleteAllNotificationsFromDB = async (userId: string) => {
  const result = await prisma.notification.deleteMany({
    where: { receiverId: userId },
  });

  if (result.count === 0) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'No notifications found or already deleted!',
    );
  }

  return result;
};

export const NotificationService = {
  createNotificationIntoDB,
  sendGeneralNotificationIntoDB,
  getAllNotificationFromDB,
  getANotificationFromDB,
  markAsDoneFromDB,
  deleteANotificationFromDB,
  deleteAllNotificationsFromDB,
};
