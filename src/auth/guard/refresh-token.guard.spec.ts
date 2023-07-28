import { Test, TestingModule } from '@nestjs/testing';
import { RefreshTokenGuard } from './refresh-token.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LogService } from 'src/log/log.service';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';

describe('RefreshTokenGuard', () => {
  let guard: RefreshTokenGuard;
  let jwtSvc: JwtService;
  let config: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RefreshTokenGuard, JwtService, ConfigService, LogService]
    }).compile();

    guard = module.get<RefreshTokenGuard>(RefreshTokenGuard);
    jwtSvc = module.get<JwtService>(JwtService);
    config = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('canActivate()', () => {
    it('should return true if token is valid', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            cookies: { refresh_token: 'cookie' }
          })
        })
      };
      jest.spyOn(jwtSvc, 'verifyAsync').mockResolvedValue({});

      const result = await guard.canActivate(context as ExecutionContext);
      expect(result).toEqual(true);
    });

    it('should call jwtSvc.verifyAsync with correct arguments', async () => {
      const token = 'cookie';
      const secret = 'JWT_REFRESH_SECRET';

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            cookies: { refresh_token: 'cookie' }
          })
        })
      };
      jest
        .spyOn(config, 'get')
        .mockImplementation((key: string) =>
          key === 'JWT_REFRESH_SECRET' ? secret : ''
        );
      jest.spyOn(jwtSvc, 'verifyAsync').mockResolvedValue({});

      await guard.canActivate(context as ExecutionContext);
      expect(jwtSvc.verifyAsync).toHaveBeenCalledWith(token, { secret });
    });

    it('should throw UnauthorizedException if no token in cookies', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ cookies: {} })
        })
      };
      expect(
        async () => await guard.canActivate(context as ExecutionContext)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if token not named "refresh_token"', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ cookies: { refreshToken: 'cookie' } })
        })
      };
      expect(
        async () => await guard.canActivate(context as ExecutionContext)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            cookies: { refresh_token: 'cookie' }
          })
        })
      };
      jest.spyOn(jwtSvc, 'verifyAsync').mockImplementation(() => {
        throw new Error();
      });
      expect(
        async () => await guard.canActivate(context as ExecutionContext)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should add the JWT payload to request.user', async () => {
      const request = {
        cookies: { refresh_token: 'cookie' }
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request
        })
      };
      const payload = {
        sub: randomUUID(),
        username: 'username',
        refreshToken: request.cookies.refresh_token
      };
      jest.spyOn(jwtSvc, 'verifyAsync').mockResolvedValue(payload);

      await guard.canActivate(context as ExecutionContext);
      expect(request['user']).toEqual(payload);
    });
  });
});
