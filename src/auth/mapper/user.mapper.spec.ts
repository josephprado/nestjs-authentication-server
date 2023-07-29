import { Test, TestingModule } from '@nestjs/testing';
import { UserMapper } from './user.mapper';
import { randomUUID } from 'crypto';
import { User } from '../entity/user.entity';
import { UserDto } from '../dto/user/user.dto';

describe('UserMapper', () => {
  let map: UserMapper;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserMapper]
    }).compile();

    map = module.get<UserMapper>(UserMapper);
  });

  describe('userToDto()', () => {
    it('should convert a user to user DTO', () => {
      const user: User = {
        id: randomUUID(),
        username: 'username',
        email: 'username@email.com',
        hashedPassword: 'xyz',
        createDate: new Date(),
        updateDate: new Date()
      };
      const dto: UserDto = {
        id: user.id,
        username: user.username,
        email: user.email
      };
      const actual = map.userToDto(user);
      expect(actual).toEqual(dto);
    });
  });
});
