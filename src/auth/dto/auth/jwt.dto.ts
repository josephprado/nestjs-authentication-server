import { IsNotEmpty, IsNumber } from 'class-validator';

/**
 * Contains access and refresh JSON Web Tokens (JWT), along with the access token expiration (in seconds)
 */
export class JwtDto {
  @IsNotEmpty()
  accessToken: string;

  @IsNumber()
  expiresIn: number;

  @IsNotEmpty()
  refreshToken: string;
}
