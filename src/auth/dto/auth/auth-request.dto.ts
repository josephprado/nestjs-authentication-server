import { Request } from 'express';

/**
 * Represents an authorized HTTP request with user information
 */
export class AuthRequest extends Request {
  user: {
    sub: string;
    username: string;
    refreshToken?: string;
  };
}
