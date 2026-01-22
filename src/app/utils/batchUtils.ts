import prisma from "./prisma";

export async function findBatchIdByTitle(title: string): Promise<string | null> {
  const batch = await prisma.batch.findFirst({
    where: { title: { equals: title, mode: 'insensitive' }, isDeleted: false },
    select: { id: true },
  });
  return batch?.id || null;
}

export async function hasBatch(userId: string, batchId: string): Promise<boolean> {
  const achievement = await prisma.achievement.findFirst({
    where: {
      userId,
      badges: { some: { id: batchId } },
    },
  });
  return !!achievement;
}