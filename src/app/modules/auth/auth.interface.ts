import { UserRole } from "@prisma/client"

export interface TRegisterUser {
  name: string
  email: string
  password: string
  role: UserRole
}

export interface TLoginUser {
  email: string
  password: string
  fcmToken?: string
}
