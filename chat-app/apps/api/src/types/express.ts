import type { Request } from 'express';
import type { JwtUser } from '../lib/jwt';

export type AuthedRequest = Request & {
  user: JwtUser;
};
