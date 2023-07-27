import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LogService } from 'src/log/log.service';
import { UserService } from './user.service';
import { User } from '../entity/user.entity';
import { SignUpDto } from '../dto/auth/sign-up.dto';
import { SignInDto } from '../dto/auth/sign-in.dto';
import { JwtService } from '@nestjs/jwt';
import { TokensDto } from '../dto/auth/tokens.dto';
import * as argon2 from 'argon2';

/**
 * Provides authentication and authorization services
 *
 * @see https://www.elvisduru.com/blog/nestjs-jwt-authentication-refresh-token
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly USER_SVC: UserService,
    private readonly JWT_SVC: JwtService,
    private readonly CONFIG: ConfigService,
    private readonly LOGGER: LogService
  ) {
    this.LOGGER.setContext(AuthService.name);
  }

  /**
   * Registers a new user with the server and returns access/refresh tokens
   *
   * @param dto A sign-up DTO
   * @returns A tokens DTO
   */
  async signUp(dto: SignUpDto): Promise<TokensDto> {
    const existingUser = await this.USER_SVC.findOneByUsername(dto.username);

    if (existingUser) {
      const message = 'User already exists.';
      this.LOGGER.error(message);
      throw new BadRequestException(message);
    }

    const user = new User();
    user.username = dto.username;
    user.email = dto.email;
    user.hashedPassword = await this.hashData(dto.password);

    const { id, username } = await this.USER_SVC.create(user);

    const tokens = await this.getTokens(id, username);
    await this.updateRefreshToken(id, tokens.refreshToken);
    return tokens;
  }

  /**
   * Validates user credentials. If successful, returns access/refresh tokens.
   * The previous refresh token will be invalidated.
   *
   * @param dto A sign-in DTO
   * @returns A tokens DTO
   */
  async signIn(dto: SignInDto): Promise<TokensDto> {
    const handleUnauthorized = () => {
      const message = 'The user credentials are invalid.';
      this.LOGGER.error(message);
      throw new UnauthorizedException(message);
    };

    const user = await this.USER_SVC.findOneByUsername(dto.username);
    if (!user) handleUnauthorized();

    const validPassword = await argon2.verify(
      user.hashedPassword,
      dto.password
    );
    if (!validPassword) handleUnauthorized();

    const tokens = await this.getTokens(user.id, user.username);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  /**
   * Invalidates the refresh token for the identified user
   *
   * @param userId A user id
   */
  async signOut(userId: string): Promise<void> {
    this.USER_SVC.update(userId, { hashedRefreshToken: null });
  }

  /**
   * Generates new access/refresh tokens
   *
   * @param userId A user id
   * @param refreshToken A refresh token
   * @returns A tokens DTO
   */
  async refreshTokens(
    userId: string,
    refreshToken: string
  ): Promise<TokensDto> {
    const handleForbidden = (message: string) => {
      this.LOGGER.error(message);
      throw new ForbiddenException(message);
    };

    const user = await this.USER_SVC.findOneById(userId);

    if (!user) handleForbidden('User not found.');
    if (!user.hashedRefreshToken) handleForbidden('User not logged in.');

    const validRefreshToken = await argon2.verify(
      user.hashedRefreshToken,
      refreshToken
    );
    if (!validRefreshToken) handleForbidden('Invalid token.');

    const tokens = await this.getTokens(user.id, user.username);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  /**
   * Updates the user's refresh token
   *
   * @param userId A user id
   * @param refreshToken A refresh token
   */
  private async updateRefreshToken(
    userId: string,
    refreshToken: string
  ): Promise<void> {
    await this.USER_SVC.update(userId, {
      hashedRefreshToken: await this.hashData(refreshToken)
    });
  }

  /**
   * Hashes a string of data
   *
   * @param data A string of data
   * @returns The hashed data
   */
  private async hashData(data: string): Promise<string> {
    return argon2.hash(data);
  }

  /**
   * Creates new access/refresh tokens
   *
   * @param userId A user id
   * @param username A username
   * @returns A tokens DTO
   */
  private async getTokens(
    userId: string,
    username: string
  ): Promise<TokensDto> {
    const signToken = async (
      typeKey: string,
      expireKey: string
    ): Promise<string> => {
      return this.JWT_SVC.signAsync(
        {
          sub: userId,
          username
        },
        {
          secret: this.CONFIG.get(typeKey),
          expiresIn: this.CONFIG.get(expireKey)
        }
      );
    };

    const [accessToken, refreshToken] = await Promise.all([
      signToken('JWT_ACCESS_SECRET', 'JWT_ACCESS_EXPIRE'),
      signToken('JWT_REFRESH_SECRET', 'JWT_REFRESH_EXPIRE')
    ]);

    const decodedAccess = this.JWT_SVC.decode(accessToken);
    const accessExpiresIn = decodedAccess['exp'] - decodedAccess['iat'];

    const decodedRefresh = this.JWT_SVC.decode(refreshToken);
    const refreshExpiresAt = new Date(decodedRefresh['exp'] * 1000);

    return {
      accessToken,
      accessExpiresIn,
      refreshToken,
      refreshExpiresAt
    };
  }
}
