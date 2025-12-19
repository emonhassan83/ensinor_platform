import { Prisma } from '@prisma/client';

export const applyStorageUsage = async (
  tx: Prisma.TransactionClient,
  params: {
    authorId: string;
    courseId: string;
    fileStorage: number;
  },
) => {
  const { authorId, courseId, fileStorage } = params;

  if (!fileStorage || fileStorage <= 0) return;

  const course = await tx.course.findUnique({
    where: { id: courseId },
    select: {
      platform: true,
      companyId: true,
    },
  });

  if (!course) return;

  // ✅ Admin / Platform Instructor → User storage
  if (course.platform === 'admin' && !course.companyId) {
    await tx.user.update({
      where: { id: authorId },
      data: {
        storage: { increment: fileStorage },
      },
    });
    return;
  }

  // ✅ Company Admin / Business Instructor → Company storage
  if (course.companyId) {
    await tx.company.update({
      where: { id: course.companyId },
      data: {
        storage: { increment: fileStorage },
      },
    });
  }
};
