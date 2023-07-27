import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LogService } from 'src/log/log.service';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from '../service/auth.service';
import { SignUpDto } from '../dto/auth/sign-up.dto';
import { SignInDto } from '../dto/auth/sign-in.dto';
import { AccessTokenDto } from '../dto/auth/access-token.dto';
import { randomUUID } from 'crypto';
import { AuthRequest } from '../dto/auth/auth-request.dto';

describe('AuthController', () => {
  let con: AuthController;
  let svc: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        ConfigService,
        LogService,
        JwtService,
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
    svc = module.get<AuthService>(AuthService);
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
      expect(svc.signUp).toHaveBeenCalledWith(dto);
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
      const dto = new SignInDto();

      jest
        .spyOn(AuthController.prototype as any, 'setCookieAndReturn')
        .mockReturnValue(new AccessTokenDto());

      await con.signIn(dto, null);
      expect(svc.signIn).toHaveBeenCalledWith(dto);
    });

    it('should return an AccessTokenDto', async () => {
      const accessTokenDto: AccessTokenDto = {
        accessToken: randomUUID(),
        expiresIn: 1
      };
      jest
        .spyOn(AuthController.prototype as any, 'setCookieAndReturn')
        .mockReturnValue(accessTokenDto);

      const actual = await con.signIn(new SignInDto(), null);
      expect(actual).toEqual(accessTokenDto);
    });
  });

  describe('signOut()', () => {
    it('should call svc.signOut with correct arguments', async () => {
      const sub = randomUUID();
      const req = { user: { sub, username: 'username' } };
      await con.signOut(req as AuthRequest);
      expect(svc.signOut).toHaveBeenCalledWith(sub);
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
      expect(svc.refreshTokens).toHaveBeenCalledWith(sub, refreshToken);
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
