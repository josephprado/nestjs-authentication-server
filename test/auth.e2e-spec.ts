import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app/app.module';
import { LogService } from 'src/log/log.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/auth/service/auth.service';
import { AccessTokenDto } from 'src/auth/dto/auth/access-token.dto';
import { UserService } from 'src/auth/service/user.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/auth/entity/user.entity';
import { signUp } from './test-utils';
import * as cookieParser from 'cookie-parser';
import * as argon2 from 'argon2';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let config: ConfigService;
  let jwtSvc: JwtService;
  let repo: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [
        LogService,
        ConfigService,
        UserService,
        JwtService,
        AuthService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository<User>
        }
      ]
    }).compile();

    app = module.createNestApplication();
    app.use(cookieParser());
    config = module.get<ConfigService>(ConfigService);
    jwtSvc = module.get<JwtService>(JwtService);
    repo = module.get<Repository<User>>(getRepositoryToken(User));
    await app.init();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await repo.query('DELETE FROM db_user');
    await app.close();
  });

  describe('POST /api/auth/signup', () => {
    it('should return CREATED status', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          username: 'username',
          email: 'username@email.com',
          password: 'password'
        })
        .expect(HttpStatus.CREATED);
    });

    it('should return an AccessTokenDto', async () => {
      const accessTokenDto: AccessTokenDto = {
        accessToken: expect.any(String),
        expiresIn: expect.any(Number)
      };
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          username: 'username',
          email: 'username@email.com',
          password: 'password'
        })
        .expect(({ body }) => {
          expect(body).toEqual(accessTokenDto);
        });
    });

    it('should place a refresh_token in cookies with correct attributes', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          username: 'username',
          email: 'username@email.com',
          password: 'password'
        })
        .expect(({ headers }) => {
          const refreshTokenCookie = headers['set-cookie'].find(
            (cookie: string) => cookie.startsWith('refresh_token')
          );
          expect(refreshTokenCookie).toBeDefined();
          expect(refreshTokenCookie).toContain('HttpOnly');
          expect(refreshTokenCookie).toContain('Secure');
          expect(refreshTokenCookie).toContain('Path=/api/auth/refresh');
          expect(refreshTokenCookie).toContain('SameSite=Strict');
          expect(refreshTokenCookie).toContain('Expires');
        });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return OK status', async () => {
      const { username, password } = await signUp(app);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username, password })
        .expect(HttpStatus.OK);
    });

    it('should return UNAUTHORIZED status if username does not exist', async () => {
      const { username, password } = await signUp(app);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: `${username}1`, password })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return UNAUTHORIZED status if password is invalid', async () => {
      const { username, password } = await signUp(app);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username, password: `${password}1` })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return UNAUTHORIZED status if both username and password are invalid', async () => {
      const { username, password } = await signUp(app);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: `${username}1`, password: `${password}1` })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return an AccessTokenDto', async () => {
      const { username, password } = await signUp(app);

      const accessTokenDto: AccessTokenDto = {
        accessToken: expect.any(String),
        expiresIn: expect.any(Number)
      };
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username, password })
        .expect(({ body }) => {
          expect(body).toEqual(accessTokenDto);
        });
    });

    it('should replace the current refresh token in the database', async () => {
      const { username, password } = await signUp(app);
      const { hashedRefreshToken: oldHash } = await repo.findOneBy({
        username
      });

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username, password });

      const { hashedRefreshToken: newHash } = await repo.findOneBy({
        username
      });
      expect(newHash).not.toEqual(oldHash);
    });

    it('should place a refresh_token in cookies with correct attributes', async () => {
      const { username, password } = await signUp(app);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username, password })
        .expect(({ headers }) => {
          const refreshTokenCookie = headers['set-cookie'].find(
            (cookie: string) => cookie.startsWith('refresh_token')
          );
          expect(refreshTokenCookie).toBeDefined();
          expect(refreshTokenCookie).toContain('HttpOnly');
          expect(refreshTokenCookie).toContain('Secure');
          expect(refreshTokenCookie).toContain('Path=/api/auth/refresh');
          expect(refreshTokenCookie).toContain('SameSite=Strict');
          expect(refreshTokenCookie).toContain('Expires');
        });
    });
  });

  describe('GET /api/auth/logout', () => {
    it('should return OK status', async () => {
      const { accessToken } = await signUp(app);

      await request(app.getHttpServer())
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);
    });

    it('should return UNAUTHORIZED status if no access token is provided in headers', async () => {
      await signUp(app);

      await request(app.getHttpServer())
        .get('/api/auth/logout')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return UNAUTHORIZED status if access token is invalid', async () => {
      const { accessToken } = await signUp(app);

      await request(app.getHttpServer())
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}1`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return UNAUTHORIZED status if access token is expired', async () => {
      // Signup user to obtain id
      const { id: sub, username } = await signUp(app);
      const user = { sub, username };

      const shortAccessToken = await jwtSvc.signAsync(user, {
        secret: config.get('JWT_ACCESS_SECRET'),
        expiresIn: '1s'
      });
      const refreshToken = await jwtSvc.signAsync(user, {
        secret: config.get('JWT_REFRESH_SECRET'),
        expiresIn: config.get('JWT_REFRESH_EXPIRE')
      });
      jest.spyOn(AuthService.prototype as any, 'getTokens').mockReturnValue({
        accessToken: shortAccessToken,
        accessExpiresIn: 1,
        refreshToken,
        refreshExpiresAt: new Date()
      });

      // Wait 3 seconds before using the token
      await new Promise((x) => setTimeout(x, 3000));

      await request(app.getHttpServer())
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${shortAccessToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should nullify user hashedRefreshToken in the database', async () => {
      const { accessToken, id } = await signUp(app);

      await request(app.getHttpServer())
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      const { hashedRefreshToken } = await repo.findOneBy({ id });
      expect(hashedRefreshToken).toBeNull();
    });
  });

  describe('GET /api/auth/refresh', () => {
    it('should return OK status', async () => {
      const { cookies } = await signUp(app);

      await request(app.getHttpServer())
        .get('/api/auth/refresh')
        .set('Cookie', cookies)
        .expect(HttpStatus.OK);
    });

    it('should return UNAUTHORIZED status if no refresh token is provided in cookies', async () => {
      await signUp(app);

      await request(app.getHttpServer())
        .get('/api/auth/refresh')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return UNAUTHORIZED status if refresh token is invalid', async () => {
      const { cookies, refreshToken } = await signUp(app);

      const index = cookies.findIndex((c: string) =>
        c.startsWith('refresh_token')
      );

      // Modify the refresh token so it is invalid
      cookies[index] = cookies[index].replace(refreshToken, `${refreshToken}1`);

      await request(app.getHttpServer())
        .get('/api/auth/refresh')
        .set('Cookie', cookies)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return UNAUTHORIZED status if refresh token is expired', async () => {
      // Signup user to obtain id
      const { id: sub, username, cookies } = await signUp(app);
      const user = { sub, username };

      const shortRefreshToken = await jwtSvc.signAsync(user, {
        secret: config.get('JWT_REFRESH_SECRET'),
        expiresIn: '1s'
      });
      const accessToken = await jwtSvc.signAsync(user, {
        secret: config.get('JWT_ACCESS_SECRET'),
        expiresIn: config.get('JWT_ACCESS_EXPIRE')
      });
      jest.spyOn(AuthService.prototype as any, 'getTokens').mockReturnValue({
        accessToken,
        accessExpiresIn: 1,
        refreshToken: shortRefreshToken,
        refreshExpiresAt: new Date()
      });

      // Refresh the tokens to inject our short-lived refresh token
      const { headers } = await request(app.getHttpServer())
        .get('/api/auth/refresh')
        .set('Cookie', cookies);

      // Wait 3 seconds before using the token
      await new Promise((x) => setTimeout(x, 3000));

      await request(app.getHttpServer())
        .get('/api/auth/refresh')
        .set('Cookie', headers['set-cookie'])
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return FORBIDDEN status if no hashed refresh token in the database', async () => {
      const { id, cookies } = await signUp(app);

      // Simulates logout
      await repo.update(id, { hashedRefreshToken: null });

      await request(app.getHttpServer())
        .get('/api/auth/refresh')
        .set('Cookie', cookies)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return FORBIDDEN status if hashed refresh token does not match database', async () => {
      const { id, cookies, refreshToken } = await signUp(app);

      // Modify the hashed refresh token in the database so it does not match the cookie
      await repo.update(id, {
        hashedRefreshToken: await argon2.hash(`${refreshToken}1`)
      });

      await request(app.getHttpServer())
        .get('/api/auth/refresh')
        .set('Cookie', cookies)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return an AccessTokenDto', async () => {
      const { cookies } = await signUp(app);

      const accessTokenDto: AccessTokenDto = {
        accessToken: expect.any(String),
        expiresIn: expect.any(Number)
      };
      await request(app.getHttpServer())
        .get('/api/auth/refresh')
        .set('Cookie', cookies)
        .expect(({ body }) => {
          expect(body).toEqual(accessTokenDto);
        });
    });

    it('should replace the current refresh token in the database', async () => {
      const { id, cookies } = await signUp(app);
      const { hashedRefreshToken: oldHash } = await repo.findOneBy({ id });

      await request(app.getHttpServer())
        .get('/api/auth/refresh')
        .set('Cookie', cookies);

      const { hashedRefreshToken: newHash } = await repo.findOneBy({ id });
      expect(newHash).not.toEqual(oldHash);
    });

    it('should place a refresh_token in cookies with correct attributes', async () => {
      const { cookies } = await signUp(app);

      await request(app.getHttpServer())
        .get('/api/auth/refresh')
        .set('Cookie', cookies)
        .expect(({ headers }) => {
          const refreshTokenCookie = headers['set-cookie'].find(
            (cookie: string) => cookie.startsWith('refresh_token')
          );
          expect(refreshTokenCookie).toBeDefined();
          expect(refreshTokenCookie).toContain('HttpOnly');
          expect(refreshTokenCookie).toContain('Secure');
          expect(refreshTokenCookie).toContain('Path=/api/auth/refresh');
          expect(refreshTokenCookie).toContain('SameSite=Strict');
          expect(refreshTokenCookie).toContain('Expires');
        });
    });
  });
});
