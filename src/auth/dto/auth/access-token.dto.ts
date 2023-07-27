import { IsNotEmpty, IsNumber } from 'class-validator';

/**
 * Contains an access JSON Web Token (JWT), along with its expiration (in seconds)
 */
export class AccessTokenDto {
  @IsNotEmpty()
  accessToken: string;

  @IsNumber()
  expiresIn: number;
}
