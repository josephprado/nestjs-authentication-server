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
    private readonly SECRET_TYPE: string,
    private readonly REQUEST_MODIFIER: (
      request: any,
      payload: any,
      token?: string
    ) => void
  ) {
    // FIXME: logs are using controller context for some reason
    this.LOGGER.setContext(this.CONTEXT);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.LOGGER.error('Malformed token.');
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.JWT_SVC.verifyAsync(token, {
        secret: this.CONFIG.get(this.SECRET_TYPE)
      });
      this.REQUEST_MODIFIER(request, payload, token);
      payload.sub &&
        this.LOGGER.log(`Authenticated user with id=${payload.sub}.`);
    } catch {
      this.LOGGER.error('Invalid token.');
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
