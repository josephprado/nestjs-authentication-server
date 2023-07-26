import { AbstractTokenGuard } from './abstract-token.guard';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LogService } from 'src/log/log.service';

/**
 * Route handlers using this guard require a valid refresh JSON Web Token (JWT)
 */
@Injectable()
export class RefreshTokenGuard extends AbstractTokenGuard {
  constructor(
    private readonly _JWT_SVC: JwtService,
    private readonly _CONFIG: ConfigService,
    private readonly _LOGGER: LogService
  ) {
    super(
      _JWT_SVC,
      _CONFIG,
      _LOGGER,
      RefreshTokenGuard.name,
      'JWT_REFRESH_SECRET',
      (request, payload, refreshToken) => {
        request.user = { ...payload, refreshToken };
      }
    );
  }
}
