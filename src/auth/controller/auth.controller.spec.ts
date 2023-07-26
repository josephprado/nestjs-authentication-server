import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LogService } from 'src/log/log.service';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from '../service/auth.service';
import { SignUpDto } from '../dto/auth/sign-up.dto';
import { SignInDto } from '../dto/auth/sign-in.dto';
import { JwtDto } from '../dto/auth/jwt.dto';
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
      await con.signUp(dto);
      expect(svc.signUp).toHaveBeenCalledWith(dto);
    });

    it('should return a JwtDto', async () => {
      const dto = new SignUpDto();
      const jwtDto = new JwtDto();
      jest.spyOn(svc, 'signUp').mockResolvedValue(jwtDto);
      const actual = await con.signUp(dto);
      expect(actual).toEqual(jwtDto);
    });
  });

  describe('signIn()', () => {
    it('should call svc.signIn with correct arguments', async () => {
      const dto = new SignInDto();
      await con.signIn(dto);
      expect(svc.signIn).toHaveBeenCalledWith(dto);
    });

    it('should return a JwtDto', async () => {
      const dto = new SignInDto();
      const jwtDto = new JwtDto();
      jest.spyOn(svc, 'signIn').mockResolvedValue(jwtDto);
      const actual = await con.signIn(dto);
      expect(actual).toEqual(jwtDto);
    });
  });

  describe('signOut()', () => {
    it('should call svc.signOut with correct arguments', async () => {
      const sub = randomUUID();
      const request = { user: { sub, username: 'username' } };
      await con.signOut(request as AuthRequest);
      expect(svc.signOut).toHaveBeenCalledWith(sub);
    });
  });

  describe('refreshTokens()', () => {
    it('should call svc.refreshTokens with correct arguments', async () => {
      const sub = randomUUID();
      const refreshToken = 'refreshToken';
      const request = { user: { sub, username: 'username', refreshToken } };
      await con.refreshTokens(request as AuthRequest);
      expect(svc.refreshTokens).toHaveBeenCalledWith(sub, refreshToken);
    });

    it('should return a JwtDto', async () => {
      const sub = randomUUID();
      const refreshToken = 'refreshToken';
      const request = { user: { sub, username: 'username', refreshToken } };
      const jwtDto = new JwtDto();
      jest.spyOn(svc, 'refreshTokens').mockResolvedValue(jwtDto);
      const actual = await con.refreshTokens(request as AuthRequest);
      expect(actual).toEqual(jwtDto);
    });
  });
});
