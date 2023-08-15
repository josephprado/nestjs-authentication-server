import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards
} from '@nestjs/common';
import { LogService } from 'src/log/log.service';
import { UserService } from '../service/user.service';
import { AuthService } from '../service/auth.service';
import { SignUpDto } from '../dto/auth/sign-up.dto';
import { SignInDto } from '../dto/auth/sign-in.dto';
import { TokensDto } from '../dto/auth/tokens.dto';
import { AccessTokenDto } from '../dto/auth/access-token.dto';
import { SignInResponseDto } from '../dto/auth/sign-in-response.dto';
import { AccessTokenGuard } from '../guard/access-token.guard';
import { RefreshTokenGuard } from '../guard/refresh-token.guard';
import { AuthRequest } from '../dto/auth/auth-request.dto';
import { Response } from 'express';

/**
 * Handles requests related to user authentication and authorization
 */
@Controller('/api/auth')
export class AuthController {
  constructor(
    private readonly AUTH_SVC: AuthService,
    private readonly USER_SVC: UserService,
    private readonly LOGGER: LogService
  ) {
    this.LOGGER.setContext(AuthController.name);
  }

  REFRESH_TOKEN = 'refresh_token';
  REFRESH_TOKEN_PATH = '/api/auth/refresh';

  /**
   * Registers a new user with the server and provides an access token
   *
   * @param dto A sign-up DTO
   * @param res An HTTP response
   * @returns An access-token DTO
   */
  @Post('/signup')
  async signUp(
    @Body() dto: SignUpDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<AccessTokenDto> {
    this.LOGGER.log(`Sign-up username=${dto.username}.`);
    const tokens = await this.AUTH_SVC.signUp(dto);
    return this.setCookieAndReturn(tokens, res);
  }

  /**
   * Validates user credentials. If successful, returns an access token and the user id.
   * The previous refresh token will be invalidated.
   *
   * @param dto A sign-in DTO
   * @param res An HTTP response
   * @returns A sign-in-response DTO
   */
  @HttpCode(HttpStatus.OK)
  @Post('/login')
  async signIn(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<SignInResponseDto> {
    this.LOGGER.log(`User ${dto.username} login attempt.`);
    const tokens = await this.AUTH_SVC.signIn(dto);
    const userId = (await this.USER_SVC.findOneByUsername(dto.username)).id;
    return { ...this.setCookieAndReturn(tokens, res), userId };
  }

  /**
   * Invalidates the refresh token for the identified user. Client must include a valid access token
   * as a 'Bearer' token in the Authorization header of the request.
   *
   * @param req An authenticated HTTP request object
   * @param res An HTTP response
   */
  @UseGuards(AccessTokenGuard)
  @Get('/logout')
  async signOut(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response
  ): Promise<void> {
    this.LOGGER.log(`User ${req.user.username} logout.`);
    await this.AUTH_SVC.signOut(req.user.sub);
    res.clearCookie(this.REFRESH_TOKEN, { path: this.REFRESH_TOKEN_PATH });
  }

  /**
   * Generates new access/refresh tokens. A valid refresh token must be present in the cookies
   * transmitted with the request.
   *
   * @param req An authenticated HTTP request object
   * @param res An HTTP response
   * @returns An access-token DTO
   */
  @UseGuards(RefreshTokenGuard)
  @Get('/refresh')
  async refreshTokens(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response
  ): Promise<AccessTokenDto> {
    const { sub, refreshToken } = req.user;
    this.LOGGER.log(`Refresh token for user with id=${sub}.`);
    const tokens = await this.AUTH_SVC.refreshTokens(sub, refreshToken);
    return this.setCookieAndReturn(tokens, res);
  }

  /**
   * Sets the refresh token as an HTTP only cookie and returns an access-token DTO
   *
   * @param tokens A tokens DTO
   * @param response An HTTP response
   * @returns An access-token DTO
   */
  private setCookieAndReturn(
    tokens: TokensDto,
    response: Response
  ): AccessTokenDto {
    const { accessToken, accessExpiresIn, refreshToken, refreshExpiresAt } =
      tokens;

    response.cookie(this.REFRESH_TOKEN, refreshToken, {
      // Cookie is inaccessible to JavaScript Document.cookie API
      httpOnly: true,

      // Browser only sends cookie on HTTPS requests (not HTTP)
      secure: true,

      // Browser only sends cookie if this path is present in the URL
      path: this.REFRESH_TOKEN_PATH,

      // Browser only sends cookie with requests to the cookie's origin site.
      // If sameSite=lax, browser also sends cookie when user navigates to origin site (from a link)
      sameSite: 'strict',

      expires: refreshExpiresAt
    });
    return { accessToken, expiresIn: accessExpiresIn };
  }
}
