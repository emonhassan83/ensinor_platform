import { UserRole } from "@prisma/client"
import prisma from "./prisma"

export const findAdmin = async () => {
  return await prisma.user.findFirst({
    where: { role: UserRole.super_admin },
  })
}