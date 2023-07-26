import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * Contains attributes required to register a new user to the app
 */
export class SignUpDto {
  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}
