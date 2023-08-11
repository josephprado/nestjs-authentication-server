import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LogService } from 'src/log/log.service';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from '../service/auth.service';
import { SignUpDto } from '../dto/auth/sign-up.dto';
import { SignInDto } from '../dto/auth/sign-in.dto';
import { AccessTokenDto } from '../dto/auth/access-token.dto';
import { SignInResponseDto } from '../dto/auth/sign-in-response.dto';
import { UserService } from '../service/user.service';
import { User } from '../entity/user.entity';
import { randomUUID } from 'crypto';
import { AuthRequest } from '../dto/auth/auth-request.dto';

describe('AuthController', () => {
  let con: AuthController;
  let authSvc: AuthService;
  let userSvc: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        ConfigService,
        LogService,
        JwtService,
        {
          provide: UserService,
          useValue: { findOneByUsername: jest.fn() }
        },
        {
          provide: AuthService,
          useValue: {
            signUp: jest.fn(),
            signIn: jest.fn(),
            signOut: jest.fn(),
            refreshTokens: jest.fn()
          }
        }
      ]
    }).compile();

    con = module.get<AuthController>(AuthController);
    authSvc = module.get<AuthService>(AuthService);
    userSvc = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('signUp()', () => {
    it('calls svc.signup with correct arguments', async () => {
      const dto = new SignUpDto();

      jest
        .spyOn(AuthController.prototype as any, 'setCookieAndReturn')
        .mockReturnValue(new AccessTokenDto());

      await con.signUp(dto, null);
      expect(authSvc.signUp).toHaveBeenCalledWith(dto);
    });

    it('should return an AccessTokenDto', async () => {
      const accessTokenDto: AccessTokenDto = {
        accessToken: randomUUID(),
        expiresIn: 1
      };
      jest
        .spyOn(AuthController.prototype as any, 'setCookieAndReturn')
        .mockReturnValue(accessTokenDto);

      const actual = await con.signUp(new SignUpDto(), null);
      expect(actual).toEqual(accessTokenDto);
    });
  });

  describe('signIn()', () => {
    it('should call svc.signIn with correct arguments', async () => {
      const dto: SignInDto = {
        username: 'username',
        password: 'password'
      };

      jest
        .spyOn(AuthController.prototype as any, 'setCookieAndReturn')
        .mockReturnValue(new AccessTokenDto());

      jest.spyOn(userSvc, 'findOneByUsername').mockResolvedValue(new User());

      await con.signIn(dto, null);
      expect(authSvc.signIn).toHaveBeenCalledWith(dto);
    });

    it('should return a SignInResponseDto', async () => {
      const user: User = {
        id: randomUUID(),
        username: 'username',
        email: 'username@email.com',
        hashedPassword: 'xyz',
        createDate: new Date(),
        updateDate: new Date()
      };
      const signInDto: SignInDto = {
        username: user.username,
        password: 'password'
      };
      const accessTokenDto: AccessTokenDto = {
        accessToken: randomUUID(),
        expiresIn: 1
      };
      const signInResponseDto: SignInResponseDto = {
        ...accessTokenDto,
        userId: user.id
      };

      jest
        .spyOn(AuthController.prototype as any, 'setCookieAndReturn')
        .mockReturnValue(accessTokenDto);

      jest
        .spyOn(userSvc, 'findOneByUsername')
        .mockImplementation(async (username) =>
          username === user.username ? user : null
        );

      const actual = await con.signIn(signInDto, null);
      expect(actual).toEqual(signInResponseDto);
    });
  });

  describe('signOut()', () => {
    it('should call svc.signOut with correct arguments', async () => {
      const sub = randomUUID();
      const req = { user: { sub, username: 'username' } };
      await con.signOut(req as AuthRequest);
      expect(authSvc.signOut).toHaveBeenCalledWith(sub);
    });
  });

  describe('refreshTokens()', () => {
    it('should call svc.refreshTokens with correct arguments', async () => {
      const sub = randomUUID();
      const refreshToken = 'refreshToken';
      const request = { user: { sub, username: 'username', refreshToken } };

      jest
        .spyOn(AuthController.prototype as any, 'setCookieAndReturn')
        .mockReturnValue(new AccessTokenDto());

      await con.refreshTokens(request as AuthRequest, null);
      expect(authSvc.refreshTokens).toHaveBeenCalledWith(sub, refreshToken);
    });

    it('should return an AccessTokenDto', async () => {
      const sub = randomUUID();
      const refreshToken = 'refreshToken';
      const request = { user: { sub, username: 'username', refreshToken } };
      const accessTokenDto: AccessTokenDto = {
        accessToken: randomUUID(),
        expiresIn: 1
      };
      jest
        .spyOn(AuthController.prototype as any, 'setCookieAndReturn')
        .mockReturnValue(accessTokenDto);

      const actual = await con.refreshTokens(request as AuthRequest, null);
      expect(actual).toEqual(accessTokenDto);
    });
  });
});
