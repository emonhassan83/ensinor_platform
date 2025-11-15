import jwt, { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../config';

const createToken = (
  payload: object,
  secret: Secret,
  expiresIn: `${number}${"s" | "m" | "h" | "d"}`
): string => {
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn,
  });
};

const verifyToken = (token: string, secret: Secret): JwtPayload => {
  return jwt.verify(token, secret) as JwtPayload;
};

const createPasswordResetToken = (payload: object) => {
  return jwt.sign(payload, config.jwt_access_secret as Secret, {
    algorithm: 'HS256',
    expiresIn: config.jwt_access_expires_in,  // No need to cast now
  });
};

export const jwtHelpers = {
  createToken,
  verifyToken,
  createPasswordResetToken,
};
