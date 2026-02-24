import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export type JwtUser = {
  userId: string;
  email: string;
};

export const signJwt = (payload: JwtUser): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
};

export const verifyJwt = (token: string): JwtUser => {
  return jwt.verify(token, config.jwtSecret) as JwtUser;
};

