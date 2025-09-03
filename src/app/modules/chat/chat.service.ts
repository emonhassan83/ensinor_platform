import { Batch, Chat, Prisma } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IChat, IChatFilterRequest } from './chat.interface';
import { chatSearchAbleFields } from './chat.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';

const insertIntoDB = async (payload: IChat & { participants: { userId: string }[] }) => {
  const result = await prisma.chat.create({
    data: {
      type: payload.type,
      groupName: payload.groupName,
      groupImage: payload.groupImage,
      participants: {
        create: payload.participants.map(p => ({
          userId: p.userId,
        })),
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              photoUrl: true,
            },
          },
        },
      },
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Chat creation failed!');
  }

  return result;
};


const getAllFromDB = async (
  params: IChatFilterRequest,
  options: IPaginationOptions,
  reference?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.ChatWhereInput[] = [];

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: chatSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.ChatWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.chat.findMany({
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
      participants: true,
    },
  });

  const total = await prisma.chat.count({
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

const getMyChatList = async (userId: string, searchTerm?: string) => {
  // Step 1: Find all chats where this user is a participant
  const chats = await prisma.chat.findMany({
    where: {
      participants: {
        some: { userId: userId }, // user is inside participants
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              photoUrl: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1, // latest message only
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!chats || chats.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Chat list not found");
  }

  const data = [];

  for (const chat of chats) {
    // Filter participants (exclude myself)
    const otherParticipants = chat.participants.filter(
      (p) => p.userId !== userId
    );

    // যদি সার্চ টার্ম থাকে তবে নাম দিয়ে ফিল্টার করব
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      const match = otherParticipants.some((p) =>
        p.user?.name?.toLowerCase().includes(lower)
      );
      if (!match) continue;
    }

    const latestMessage = chat.messages[0] || null;

    // Unread message count
    let unreadMessageCount = 0;
    if (latestMessage) {
      unreadMessageCount = await prisma.message.count({
        where: {
          chatId: chat.id,
          seen: false,
          senderId: { not: userId },
        },
      });
    }

    data.push({
      chat: {
        id: chat.id,
        type: chat.type,
        groupName: chat.groupName,
        groupImage: chat.groupImage,
        participants: otherParticipants.map((p) => p.user),
      },
      message: latestMessage,
      unreadMessageCount,
    });
  }

  // Sort by latest message createdAt
  data.sort((a, b) => {
    const dateA = a.message?.createdAt
      ? new Date(a.message.createdAt).getTime()
      : 0;
    const dateB = b.message?.createdAt
      ? new Date(b.message.createdAt).getTime()
      : 0;
    return dateB - dateA;
  });

  return data;
};


const getByIdFromDB = async (id: string): Promise<Chat | null> => {
  const result = await prisma.chat.findUnique({
    where: { id },
    include: {
     participants: true
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Batch not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IChat>,
): Promise<Chat> => {
  const chat = await prisma.chat.findUnique({
    where: { id },
  });
  if (!chat) {
    throw new ApiError(httpStatus.NOT_FOUND, 'chat not found!');
  }

  const result = await prisma.chat.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'chat not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<Chat> => {
  const chat = await prisma.chat.findUniqueOrThrow({
    where: { id },
  });
  if (!chat) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Chat not found!');
  }

  const result = await prisma.chat.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Chat not deleted!');
  }

  return result;
};

export const ChatService = {
  insertIntoDB,
  getAllFromDB,
  getMyChatList,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
