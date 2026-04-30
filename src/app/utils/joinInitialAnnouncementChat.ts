import { Prisma, ChatRole, ChatType, UserRole } from '@prisma/client';
import prisma from './prisma';

type TxClient = Prisma.TransactionClient | typeof prisma;


export const joinInitialAnnouncementChat = async (
  userId: string,
  role: UserRole,
  tx?: any   // optional tx
) => {
  let groupName: string | null = null;

  if (role === UserRole.company_admin) {
    groupName = 'Company Announcements';
  } else if (role === UserRole.instructor) {
    groupName = 'Instructor Announcements';
  } else if (role === UserRole.student) {
    groupName = 'Student Announcements';
  } else {
    return;
  }

  const chat = await (tx || prisma).chat.findFirst({
    where: {
      type: ChatType.announcement,
      groupName,
      isDeleted: false,
    },
    select: { id: true },
  });

  if (!chat) return;

  await (tx || prisma).chatParticipant.upsert({
    where: {
      userId_chatId: {
        userId,
        chatId: chat.id,
      },
    },
    update: {},
    create: {
      userId,
      chatId: chat.id,
      role: ChatRole.member,
    },
  });
};