import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LogService } from 'src/log/log.service';
import { UserService } from './user.service';
import { User } from '../entity/user.entity';
import { AuthService } from './auth.service';
import { SignUpDto } from '../dto/auth/sign-up.dto';
import { SignInDto } from '../dto/auth/sign-in.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtDto } from '../dto/auth/jwt.dto';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as argon2 from 'argon2';

describe('AuthService', () => {
  let authSvc: AuthService;
  let userSvc: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              switch (key) {
                case 'JWT_ACCESS_SECRET':
                case 'JWT_REFRESH_SECRET':
                  return 'abc123';
                case 'JWT_ACCESS_EXPIRE':
                case 'JWT_REFRESH_EXPIRE':
                  return '15m';
              }
            })
          }
        },
        LogService,
        JwtService,
        AuthService,
        {
          provide: UserService,
          useValue: {
            create: jest.fn(),
            findOneById: jest.fn(),
            findOneByUsername: jest.fn(),
            update: jest.fn()
          }
        }
      ]
    }).compile();

    authSvc = module.get<AuthService>(AuthService);
    userSvc = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('signUp()', () => {
    it('should check if username already exists', async () => {
      const dto: SignUpDto = {
        username: 'username',
        email: 'username@email.com',
        password: 'password'
      };
      jest.spyOn(userSvc, 'create').mockResolvedValue(new User());
      await authSvc.signUp(dto);
      expect(userSvc.findOneByUsername).toHaveBeenCalledWith(dto.username);
    });

    it('should throw BadRequestException if username already exists', async () => {
      jest.spyOn(userSvc, 'findOneByUsername').mockResolvedValue(new User());
      expect(async () => await authSvc.signUp(new SignUpDto())).rejects.toThrow(
        BadRequestException
      );
    });

    it('should hash the password before saving to the database', async () => {
      const dto: SignUpDto = {
        username: 'username',
        email: 'username@email.com',
        password: 'password'
      };
      const { username, email, password } = dto;
      const user: Partial<User> = {
        username,
        email,
        hashedPassword: expect.not.stringMatching(password)
      };
      jest.spyOn(userSvc, 'create').mockResolvedValue(new User());
      await authSvc.signUp(dto);
      expect(userSvc.create).toHaveBeenCalledWith(user);
    });

    it('should update the user hashedRefreshToken', async () => {
      const dto: SignUpDto = {
        username: 'username',
        email: 'username@email.com',
        password: 'password'
      };
      const { username, email, password } = dto;
      const user: User = {
        id: randomUUID(),
        username,
        email,
        hashedPassword: expect.not.stringMatching(password),
        createDate: new Date(),
        updateDate: new Date()
      };
      jest.spyOn(userSvc, 'create').mockResolvedValue(user);
      await authSvc.signUp(dto);
      expect(userSvc.update).toHaveBeenCalledWith(user.id, {
        hashedRefreshToken: expect.any(String)
      });
    });

    it('should return a JwtDto if successful', async () => {
      const dto: SignUpDto = {
        username: 'username',
        email: 'username@email.com',
        password: 'password'
      };
      jest.spyOn(userSvc, 'create').mockResolvedValue(new User());
      const jwtDto: JwtDto = {
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number)
      };
      const actual = await authSvc.signUp(dto);
      expect(actual).toEqual(jwtDto);
    });
  });

  describe('signIn()', () => {
    it('should check if username already exists', async () => {
      const dto: SignInDto = {
        username: 'username',
        password: 'password'
      };
      jest.spyOn(userSvc, 'findOneByUsername').mockResolvedValue(new User());
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);
      await authSvc.signIn(dto);
      expect(userSvc.findOneByUsername).toHaveBeenCalledWith(dto.username);
    });

    it('should throw UnauthorizedException if username does not exist', async () => {
      const dto: SignInDto = {
        username: 'username',
        password: 'password'
      };
      expect(async () => await authSvc.signIn(dto)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const dto: SignInDto = {
        username: 'username',
        password: 'password'
      };
      jest.spyOn(userSvc, 'findOneByUsername').mockResolvedValue(new User());
      jest.spyOn(argon2, 'verify').mockResolvedValue(false);
      expect(async () => await authSvc.signIn(dto)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should update the user hashedRefreshToken', async () => {
      const dto: SignInDto = {
        username: 'username',
        password: 'password'
      };
      const { username, password } = dto;
      const user: User = {
        id: randomUUID(),
        username,
        email: 'username@email.com',
        hashedPassword: expect.not.stringMatching(password),
        hashedRefreshToken: 'xyz',
        createDate: new Date(),
        updateDate: new Date()
      };
      jest.spyOn(userSvc, 'findOneByUsername').mockResolvedValue(user);
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);
      await authSvc.signIn(dto);
      expect(userSvc.update).toHaveBeenCalledWith(user.id, {
        hashedRefreshToken: expect.not.stringMatching(user.hashedRefreshToken)
      });
    });

    it('should return a JwtDto if successful', async () => {
      const dto: SignInDto = {
        username: 'username',
        password: 'password'
      };
      jest.spyOn(userSvc, 'findOneByUsername').mockResolvedValue(new User());
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);
      const jwtDto: JwtDto = {
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number)
      };
      const actual = await authSvc.signIn(dto);
      expect(actual).toEqual(jwtDto);
    });
  });

  describe('signOut()', () => {
    it('should nullify the user hashedRefreshToken', async () => {
      const id = randomUUID();
      await authSvc.signOut(id);
      expect(userSvc.update).toHaveBeenCalledWith(id, {
        hashedRefreshToken: null
      });
    });
  });

  describe('refreshTokens()', () => {
    it('should check if the userId exists', async () => {
      const user: User = {
        id: randomUUID(),
        username: 'username',
        email: 'username@email.com',
        hashedPassword: 'abc',
        hashedRefreshToken: 'xyz',
        createDate: new Date(),
        updateDate: new Date()
      };
      jest.spyOn(userSvc, 'findOneById').mockResolvedValue(user);
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);
      await authSvc.refreshTokens(user.id, 'refreshToken');
      expect(userSvc.findOneById).toHaveBeenCalledWith(user.id);
    });

    it('should throw ForbiddenException if the userId does not exist', async () => {
      jest.spyOn(userSvc, 'findOneById').mockResolvedValue(null);
      expect(
        async () => await authSvc.refreshTokens(randomUUID(), 'refreshToken')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if the refreshToken is invalid', async () => {
      const user: User = {
        id: randomUUID(),
        username: 'username',
        email: 'username@email.com',
        hashedPassword: 'abc',
        hashedRefreshToken: 'xyz',
        createDate: new Date(),
        updateDate: new Date()
      };
      jest.spyOn(userSvc, 'findOneById').mockResolvedValue(user);
      jest.spyOn(argon2, 'verify').mockResolvedValue(false);
      expect(
        async () => await authSvc.refreshTokens(randomUUID(), 'refreshToken')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user hashedRefreshToken is null in database', async () => {
      const user: User = {
        id: randomUUID(),
        username: 'username',
        email: 'username@email.com',
        hashedPassword: 'abc',
        hashedRefreshToken: null,
        createDate: new Date(),
        updateDate: new Date()
      };
      jest.spyOn(userSvc, 'findOneById').mockResolvedValue(user);
      expect(
        async () => await authSvc.refreshTokens(randomUUID(), 'refreshToken')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update the user hashedRefreshToken', async () => {
      const user: User = {
        id: randomUUID(),
        username: 'username',
        email: 'username@email.com',
        hashedPassword: 'abc',
        hashedRefreshToken: 'xyz',
        createDate: new Date(),
        updateDate: new Date()
      };
      jest.spyOn(userSvc, 'findOneById').mockResolvedValue(user);
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);
      await authSvc.refreshTokens(user.id, 'refreshToken');
      expect(userSvc.update).toHaveBeenCalledWith(user.id, {
        hashedRefreshToken: expect.not.stringMatching(user.hashedRefreshToken)
      });
    });

    it('should return a JwtDto if successful', async () => {
      const user: User = {
        id: randomUUID(),
        username: 'username',
        email: 'username@email.com',
        hashedPassword: 'abc',
        hashedRefreshToken: 'xyz',
        createDate: new Date(),
        updateDate: new Date()
      };
      jest.spyOn(userSvc, 'findOneById').mockResolvedValue(user);
      jest.spyOn(argon2, 'verify').mockResolvedValue(true);
      const jwtDto: JwtDto = {
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number)
      };
      const actual = await authSvc.refreshTokens(user.id, 'refreshToken');
      expect(actual).toEqual(jwtDto);
    });
  });
});
