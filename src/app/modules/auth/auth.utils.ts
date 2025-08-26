import jwt from 'jsonwebtoken'

export type TExpiresIn =
  | number
  | '30s'
  | '1m'
  | '5m'
  | '10m'
  | '1h'
  | '1d'
  | '7d'
  | '30d'
  | '365d'

export const createToken = (
  jwtPayload: { userId: string; email: string; role: string },
  secret: string,
  expiresIn: TExpiresIn,
) => {
  return jwt.sign(jwtPayload, secret, { expiresIn })
}

export const verifyToken = (token: string, secret: string) => {
  return jwt.verify(token, secret) as jwt.JwtPayload
}
