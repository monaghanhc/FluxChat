import type { Request } from 'express';
import type { JwtUser } from '../lib/jwt.js';

export type AuthedRequest = Request & {
  user: JwtUser;
};

