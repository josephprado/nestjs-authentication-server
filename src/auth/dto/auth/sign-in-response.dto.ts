import { IsNotEmpty } from 'class-validator';
import { AccessTokenDto } from './access-token.dto';

/**
 * Extension of the access-token DTO to provide the user id in client response
 */
export class SignInResponseDto extends AccessTokenDto {
  @IsNotEmpty()
  userId: string;
}
