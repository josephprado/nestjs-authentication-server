import { AbstractTokenGuard } from './abstract-token.guard';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LogService } from 'src/log/log.service';
import { Request } from 'express';

/**
 * Route handlers using this guard require a valid access JSON Web Token (JWT)
 */
@Injectable()
export class AccessTokenGuard extends AbstractTokenGuard {
  constructor(
    private readonly _JWT_SVC: JwtService,
    private readonly _CONFIG: ConfigService,
    private readonly _LOGGER: LogService
  ) {
    super(
      _JWT_SVC,
      _CONFIG,
      _LOGGER,
      AccessTokenGuard.name,
      'JWT_ACCESS_SECRET'
    );
  }

  extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  modifyRequest(request: Request, payload: any): void {
    request['user'] = payload;
  }
}
