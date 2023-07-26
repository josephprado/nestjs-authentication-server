import { Test, TestingModule } from '@nestjs/testing';
import { ThingMapper } from './thing.mapper';
import { randomUUID } from 'crypto';
import { Thing } from '../entity/thing.entity';
import { ThingDto } from '../dto/thing.dto';
import { User } from 'src/auth/entity/user.entity';
import { ThingCreateDto } from '../dto/thing-create.dto';
import { UserService } from 'src/auth/service/user.service';

describe('ThingMapper', () => {
  let userSvc: UserService;
  let map: ThingMapper;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThingMapper,
        {
          provide: UserService,
          useValue: {
            findOneById: jest.fn()
          }
        }
      ]
    }).compile();

    userSvc = module.get<UserService>(UserService);
    map = module.get<ThingMapper>(ThingMapper);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('thingToDto()', () => {
    it('should convert a Thing to ThingDto', () => {
      const thing: Thing = {
        id: randomUUID(),
        name: 'a',
        description: 'b',
        user: new User(),
        createDate: new Date(),
        updateDate: new Date()
      };
      const dto: ThingDto = {
        id: thing.id,
        name: thing.name,
        description: thing.description
      };
      const actual = map.thingToDto(thing);
      expect(actual).toEqual(dto);
    });
  });

  describe('createToThing()', () => {
    it('should convert a ThingCreateDto to Thing', async () => {
      const dto: ThingCreateDto = {
        name: 'a',
        description: 'b'
      };
      const user = new User();
      user.id = randomUUID();

      const thing = new Thing();
      thing.name = dto.name;
      thing.description = dto.description;
      thing.user = user;

      jest.spyOn(userSvc, 'findOneById').mockResolvedValue(user);

      const actual = await map.createToThing(user.id, dto);
      expect(actual).toEqual(thing);
    });
  });
});
