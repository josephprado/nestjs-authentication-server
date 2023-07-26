import { IsNotEmpty } from 'class-validator';

/**
 * Contains user login credentials
 */
export class SignInDto {
  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  password: string;
}
