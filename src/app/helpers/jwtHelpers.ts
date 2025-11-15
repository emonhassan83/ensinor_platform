import jwt, { JwtPayload } from 'jsonwebtoken';
import config from '../config';

const createToken = (
  payload: any,
  secret: any,
  expireTime: any
): string => {
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: expireTime as any,
  } as any);
};

const verifyToken = (token: string, secret: any): JwtPayload => {
  return jwt.verify(token, secret as any) as JwtPayload;
};

const createPasswordResetToken = (payload: any) => {
  return jwt.sign(payload, config.jwt_access_secret as any, {
    algorithm: 'HS256',
    expiresIn: config.jwt_access_expires_in as any,
  } as any);
};

export const jwtHelpers = {
  createToken,
  verifyToken,
  createPasswordResetToken,
};
