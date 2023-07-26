import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';
import { LogService } from 'src/log/log.service';
import { AuthService } from '../service/auth.service';
import { SignUpDto } from '../dto/auth/sign-up.dto';
import { SignInDto } from '../dto/auth/sign-in.dto';
import { JwtDto } from '../dto/auth/jwt.dto';
import { AccessTokenGuard } from '../guard/access-token.guard';
import { RefreshTokenGuard } from '../guard/refresh-token.guard';
import { AuthRequest } from '../dto/auth/auth-request.dto';

/**
 * Handles requests related to user authentication
 */
@Controller('/api/auth')
export class AuthController {
  constructor(
    private readonly AUTH_SVC: AuthService,
    private readonly LOGGER: LogService
  ) {
    this.LOGGER.setContext(AuthController.name);
  }

  /**
   * Creates a new app user
   *
   * @param dto A sign-up DTO
   * @returns If sign-up is successful, a JWT DTO
   */
  @Post('/signup')
  async signUp(@Body() dto: SignUpDto): Promise<JwtDto> {
    this.LOGGER.log(`Sign-up username=${dto.username}.`);
    return await this.AUTH_SVC.signUp(dto);
  }

  /**
   * Logs the user into the app
   *
   * @param dto A sign-in DTO
   * @returns If login is successful, a JWT DTO
   */
  @HttpCode(HttpStatus.OK)
  @Post('/login')
  async signIn(@Body() dto: SignInDto): Promise<JwtDto> {
    this.LOGGER.log(`User ${dto.username} login attempt.`);
    return await this.AUTH_SVC.signIn(dto);
  }

  /**
   * Logs the user out of the app
   *
   * @param req An authenticated HTTP request object
   */
  @UseGuards(AccessTokenGuard)
  @Get('/logout')
  async signOut(@Req() req: AuthRequest): Promise<void> {
    this.LOGGER.log(`User ${req.user.username} logout.`);
    await this.AUTH_SVC.signOut(req.user.sub);
  }

  /**
   * Refreshes the user's refresh auth token
   *
   * @param req An authenticated HTTP request object
   * @returns If successful, a JWT DTO
   */
  @UseGuards(RefreshTokenGuard)
  @Get('/refresh')
  async refreshTokens(@Req() req: AuthRequest): Promise<JwtDto> {
    const { sub, refreshToken } = req.user;
    this.LOGGER.log(`Refresh token for user with id=${sub}.`);
    return await this.AUTH_SVC.refreshTokens(sub, refreshToken);
  }
}
