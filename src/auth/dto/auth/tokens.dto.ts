import { IsDate, IsNotEmpty, IsNumber } from 'class-validator';

/**
 * Contains access and refresh JSON Web Tokens (JWT)
 */
export class TokensDto {
  @IsNotEmpty()
  accessToken: string;

  @IsNumber()
  accessExpiresIn: number;

  @IsNotEmpty()
  refreshToken: string;

  @IsDate()
  refreshExpiresAt: Date;
}
