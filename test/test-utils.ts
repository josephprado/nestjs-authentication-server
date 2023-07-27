import { INestApplication } from '@nestjs/common';
import { SignUpDto } from 'src/auth/dto/auth/sign-up.dto';
import { User } from 'src/auth/entity/user.entity';
import * as request from 'supertest';

/**
 * The default sign-up DTO used with the {@link signUp} function
 */
const defaultSignUpDto: SignUpDto = {
  username: 'username',
  email: 'username@email.com',
  password: 'password'
};

/**
 * The return type of the {@link signUp} function
 */
export interface SignUpResult {
  accessToken: string;
  refreshToken: string;
  cookies: string[];
  user: User;
  id: string;
  username: string;
  email: string;
  password: string;
}

/**
 * Registers a new user. If a dto is not provided, registers the {@link defaultSignUpDto}
 *
 * @param app A nest application
 * @param dto A sign-up DTO (optional)
 * @returns A {@link SignUpResult}
 */
export const signUp = async (
  app: INestApplication,
  dto: SignUpDto = defaultSignUpDto
): Promise<SignUpResult> => {
  const {
    body: { accessToken },
    headers
  } = await request(app.getHttpServer()).post('/api/auth/signup').send(dto);

  const { body: users } = await request(app.getHttpServer())
    .get('/api/users')
    .set('Authorization', `Bearer ${accessToken}`);

  const user = users.find((user: User) => user.username === dto.username);
  const cookies = headers['set-cookie'];
  const refreshToken = cookies.find((c: string) =>
    c.startsWith('refresh_token')
  );

  return {
    accessToken,
    refreshToken,
    cookies,
    user,
    id: user.id,
    username: user.username,
    email: user.email,
    password: dto.password
  };
};
