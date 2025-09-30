import { NextFunction, Request, Response } from 'express'
import catchAsync from '../utils/catchAsync'
import jwt, { JwtPayload } from 'jsonwebtoken'
import config from '../config'
import { UserRole, UserStatus } from '@prisma/client'
import prisma from '../utils/prisma'

export const optionalAuth = (...requiredRoles: UserRole[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization
    if (!token) {
      // No token → skip authentication, user will be undefined
      return next();
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.jwt_access_secret as string) as JwtPayload;
      const { role, email } = decoded;

      // Check if user exists
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || user.isDeleted) {
        // If token exists but user not found, treat as unauthorized
        return next();
      }

      // Only check status if user exists
      if (user.status !== UserStatus.active) {
        return next();
      }

      // Optional role check
      if (requiredRoles.length > 0 && !requiredRoles.includes(role)) {
        return next();
      }

      // Attach user info if all good
      req.user = decoded;
    } catch (err) {
      // Token invalid → ignore, treat as non-authenticated
    }

    next();
  });
};
