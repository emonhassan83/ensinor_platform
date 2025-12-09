import { ChatRole, ChatType, UserRole } from '@prisma/client';
import prisma from './prisma';

export const joinInitialAnnouncementChat = async (
  userId: string,
  role: UserRole,
) => {
  try {
    let groupName = null;

    // Map user role → announcement group
    if (role === UserRole.company_admin) {
      groupName = 'Company Announcements';
    } else if (role === UserRole.instructor) {
      groupName = 'Instructor Announcements';
    } else if (role === UserRole.student) {
      groupName = 'Student Announcements';
    } else {
      return; // This role doesn't need to join any announcement group
    }

    // Find the announcement chat for that group
    const chat = await prisma.chat.findFirst({
      where: {
        type: ChatType.announcement,
        groupName,
        isDeleted: false,
      },
      select: { id: true },
    });

    // No seeded chat found
    if (!chat) return;

    // Check if user already exists in participants
    const exists = await prisma.chatParticipant.findFirst({
      where: {
        userId,
        chatId: chat.id,
      },
    });

    // If already exists → skip
    if (exists) return;

    // Add participant to group
    await prisma.chatParticipant.create({
      data: {
        userId,
        chatId: chat.id,
        role: ChatRole.member,
      },
    });
  } catch (error) {
    console.error('Error joining initial announcement chat:', error);
  }
};
