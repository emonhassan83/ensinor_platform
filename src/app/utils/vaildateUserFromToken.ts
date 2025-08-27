import * as jwt from 'jsonwebtoken'
import httpStatus from 'http-status'
import config from '../config'
import ApiError from '../errors/ApiError'
import prisma from './prisma'

const getUserDetailsFromToken = async (token: string) => {
  if (!token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'you are not authorized!')
  }
  const decode: any = await jwt.verify(
    token,
    config.jwt_access_secret as string,
  )
  const user = await prisma.user.findFirst(decode.userId)
  return user
}

export default getUserDetailsFromToken
