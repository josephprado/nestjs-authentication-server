import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LogService } from 'src/log/log.service';
import { Request } from 'express';

/**
 * Route handlers using this guard require a valid JSON Web Token (JWT)
 */
@Injectable()
export abstract class AbstractTokenGuard implements CanActivate {
  constructor(
    private readonly JWT_SVC: JwtService,
    private readonly CONFIG: ConfigService,
    private readonly LOGGER: LogService,
    private readonly CONTEXT: string,
    private readonly SECRET_TYPE: string
  ) {
    // FIXME: logs are using controller context for some reason
    this.LOGGER.setContext(this.CONTEXT);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      this.LOGGER.error('Malformed token.');
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.JWT_SVC.verifyAsync(token, {
        secret: this.CONFIG.get(this.SECRET_TYPE)
      });
      this.modifyRequest(request, payload, token);
      payload.sub && this.LOGGER.log(`Authorized user with id=${payload.sub}.`);
    } catch {
      this.LOGGER.error('Invalid token.');
      throw new UnauthorizedException();
    }
    return true;
  }

  /**
   * Retrieves the token form the user request
   *
   * @param request An HTTP request
   */
  abstract extractToken(request: Request): string | undefined;

  /**
   * Modifies the HTTP request to add necessary properties if needed
   *
   * @param request An HTTP request
   * @param payload A JWT payload
   * @param token A JWT
   */
  abstract modifyRequest(request: Request, payload: any, token?: string): void;
}
