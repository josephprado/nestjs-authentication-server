import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LogService } from 'src/log/log.service';
import { JwtService } from '@nestjs/jwt';
import { UserController } from './user.controller';
import { UserService } from '../service/user.service';
import { UserMapper } from '../mapper/user.mapper';
import { User } from '../entity/user.entity';
import { UserDto } from '../dto/user/user.dto';
import { UserUpdateDto } from '../dto/user/user-update.dto';
import { randomUUID } from 'crypto';
import { NotFoundException } from '@nestjs/common';

describe('UserController', () => {
  let con: UserController;
  let svc: UserService;
  let map: UserMapper;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        ConfigService,
        LogService,
        JwtService,
        {
          provide: UserService,
          useValue: {
            findAll: jest.fn(),
            findOneById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
          }
        },
        {
          provide: UserMapper,
          useValue: {
            userToDto: jest.fn()
          }
        }
      ]
    }).compile();

    con = module.get<UserController>(UserController);
    svc = module.get<UserService>(UserService);
    map = module.get<UserMapper>(UserMapper);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getAll()', () => {
    it('should return a list of user DTOs', async () => {
      const user: User = {
        id: randomUUID(),
        username: 'username',
        email: 'username@email.com',
        hashedPassword: 'abc',
        hashedRefreshToken: 'xyz',
        createDate: new Date(),
        updateDate: new Date()
      };
      const userDto: UserDto = {
        id: user.id,
        username: user.username,
        email: user.email
      };
      jest.spyOn(svc, 'findAll').mockResolvedValue([user, user]);
      jest
        .spyOn(map, 'userToDto')
        .mockImplementation((x) => (x === user ? userDto : null));

      const actual = await con.getAll();
      expect(actual).toEqual([userDto, userDto]);
    });
  });

  describe('getOne()', () => {
    it('should return the expected user DTO', async () => {
      const id = randomUUID();
      const user: User = {
        id,
        username: 'username',
        email: 'username@email.com',
        hashedPassword: 'abc',
        hashedRefreshToken: 'xyz',
        createDate: new Date(),
        updateDate: new Date()
      };
      const userDto: UserDto = {
        id,
        username: user.username,
        email: user.email
      };
      jest
        .spyOn(svc, 'findOneById')
        .mockImplementation(async (x) => (x === id ? user : null));
      jest
        .spyOn(map, 'userToDto')
        .mockImplementation((x) => (x === user ? userDto : null));

      const actual = await con.getOne(id);
      expect(actual).toEqual(userDto);
    });

    it('should throw NotFoundException if id does not exist', async () => {
      jest.spyOn(svc, 'findOneById').mockResolvedValue(null);
      expect(async () => await con.getOne(randomUUID())).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateOne()', () => {
    it('should call svc.update with expected arguments', async () => {
      const id = randomUUID();
      const updates: UserUpdateDto = { username: 'username' };
      await con.updateOne(id, updates);
      expect(svc.update).toHaveBeenCalledWith(id, updates);
    });
  });

  describe('deleteOne()', () => {
    it('should call svc.delete with expected arguments', async () => {
      const id = randomUUID();
      await con.deleteOne(id);
      expect(svc.delete).toHaveBeenCalledWith(id);
    });
  });
});
