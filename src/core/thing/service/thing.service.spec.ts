import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LogService } from 'src/log/log.service';
import { ThingService } from './thing.service';
import { Thing } from '../entity/thing.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';

describe('ThingService', () => {
  let svc: ThingService;
  let repo: Repository<Thing>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        LogService,
        ThingService,
        {
          provide: getRepositoryToken(Thing),
          useValue: {
            save: jest.fn(),
            findBy: jest.fn(),
            findOneBy: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
          }
        }
      ]
    }).compile();

    svc = module.get<ThingService>(ThingService);
    repo = module.get<Repository<Thing>>(getRepositoryToken(Thing));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create()', () => {
    it('should call repo.save with correct arguments', async () => {
      const thing = new Thing();
      await svc.create(thing);
      expect(repo.save).toHaveBeenCalledWith(thing);
    });

    it('should return a thing', async () => {
      const thing = new Thing();
      jest.spyOn(repo, 'save').mockResolvedValue(thing);
      const actual = await svc.create(thing);
      expect(actual).toEqual(thing);
    });
  });

  describe('findAllByUserId()', () => {
    it('should call repo.findBy with correct arguments', async () => {
      const id = randomUUID();
      await svc.findAllByUserId(id);
      expect(repo.findBy).toHaveBeenCalledWith({ user: { id } });
    });

    it('should return a list of things', async () => {
      const thing = new Thing();
      const things = [thing, thing];
      jest.spyOn(repo, 'findBy').mockResolvedValue(things);
      const actual = await svc.findAllByUserId(randomUUID());
      expect(actual).toEqual(things);
    });
  });

  describe('findOneById()', () => {
    it('should call repo.findOneBy with correct arguments', async () => {
      const id = randomUUID();
      await svc.findOneById(id);
      expect(repo.findOneBy).toHaveBeenCalledWith({ id });
    });

    it('should return a thing', async () => {
      const thing = new Thing();
      jest.spyOn(repo, 'findOneBy').mockResolvedValue(thing);
      const actual = await svc.findOneById(randomUUID());
      expect(actual).toEqual(thing);
    });

    it('should return null if id does not exist', async () => {
      jest.spyOn(repo, 'findOneBy').mockResolvedValue(null);
      const actual = await svc.findOneById(randomUUID());
      expect(actual).toBeNull();
    });
  });

  describe('update()', () => {
    it('should call repo.update with correct arguments', async () => {
      const id = randomUUID();
      const updates: Partial<Thing> = { name: 'name' };
      await svc.update(id, updates);
      expect(repo.update).toHaveBeenCalledWith(id, updates);
    });
  });

  describe('delete()', () => {
    it('should call repo.delete with correct arguments', async () => {
      const id = randomUUID();
      await svc.delete(id);
      expect(repo.delete).toHaveBeenCalledWith(id);
    });
  });
});
