import { NextFunction, Request, Response } from 'express'
import catchAsync from '../utils/catchAsync'
import httpStatus from 'http-status'
import jwt, { JwtPayload } from 'jsonwebtoken'
import config from '../config'
import { UserRole, UserStatus } from '@prisma/client'
import ApiError from '../errors/ApiError'
import prisma from '../utils/prisma'

const auth = (...requiredRoles: UserRole[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization
    //* checking if the token is missing
    if (!token) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized Access')
    }

    //* checking if the given token is valid
    let decoded
    try {
      decoded = jwt.verify(
        token,
        config.jwt_access_secret as string,
      ) as JwtPayload
    } catch (error) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized Access!')
    }
    const { role, email, iat } = decoded

    //* checking if the user is exist
    const user = await prisma.user.findUnique({
      where: { email },
    })
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'This user is not found !')
    }
    //* checking if the user is already deleted
    if (user?.isDeleted) {
      throw new ApiError(httpStatus.FORBIDDEN, 'This user is deleted !')
    }

    //* checking if the user is blocked
    if (user?.status === UserStatus.blocked) {
      throw new ApiError(httpStatus.FORBIDDEN, 'This user is blocked !!')
    }

    if (requiredRoles && !requiredRoles.includes(role)) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized!')
    }
    req.user = decoded as JwtPayload

    next()
  })
}

export default auth
