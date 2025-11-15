import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import config from '../config';

const createToken = (
  payload: object,
  secret: Secret,
  expireTime: string
): string => {
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: expireTime,
  };

  return jwt.sign(payload, secret, options);
};

const verifyToken = (token: string, secret: Secret): JwtPayload => {
  return jwt.verify(token, secret) as JwtPayload;
};

const createPasswordResetToken = (payload: object) => {
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: config.jwt_access_expires_in as string,
  };

  return jwt.sign(payload, config.jwt_access_secret as Secret, options);
};

export const jwtHelpers = {
  createToken,
  verifyToken,
  createPasswordResetToken,
};
