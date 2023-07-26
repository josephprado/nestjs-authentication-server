import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app/app.module';
import { LogService } from 'src/log/log.service';
import { ThingService } from 'src/core/thing/service/thing.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Thing } from 'src/core/thing/entity/thing.entity';
import { ThingDto } from 'src/core/thing/dto/thing.dto';
import { ThingCreateDto } from 'src/core/thing/dto/thing-create.dto';
import { randomUUID } from 'crypto';
import { signUp } from './test-utils';

describe('ThingController (e2e)', () => {
  let app: INestApplication;
  let repo: Repository<Thing>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [
        LogService,
        ThingService,
        {
          provide: getRepositoryToken(Thing),
          useClass: Repository<Thing>
        }
      ]
    }).compile();

    app = module.createNestApplication();
    repo = module.get<Repository<Thing>>(getRepositoryToken(Thing));
    await app.init();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await repo.query('DELETE FROM db_thing');
    await repo.query('DELETE FROM db_user');
    await app.close();
  });

  describe('POST /api/things', () => {
    it('should return CREATED status', async () => {
      const { accessToken } = await signUp(app);

      const dto: ThingCreateDto = {
        name: 'name',
        description: 'description'
      };
      await request(app.getHttpServer())
        .post('/api/things')
        .send(dto)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.CREATED);
    });

    it('should return the created thing', async () => {
      const { accessToken } = await signUp(app);

      const thingCreateDto: ThingCreateDto = {
        name: 'name',
        description: 'description'
      };
      const thingDto: ThingDto = {
        id: expect.any(String),
        name: 'name',
        description: 'description'
      };
      await request(app.getHttpServer())
        .post('/api/things')
        .send(thingCreateDto)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(({ body }) => {
          expect(body).toEqual(thingDto);
        });
    });

    it('should add the thing to the database', async () => {
      const { accessToken, user } = await signUp(app);

      const dto: ThingCreateDto = {
        name: 'name',
        description: 'description'
      };
      const thing: Thing = {
        id: expect.any(String),
        name: 'name',
        description: 'description',
        user,
        createDate: expect.any(Date),
        updateDate: expect.any(Date)
      };
      await request(app.getHttpServer())
        .post('/api/things')
        .send(dto)
        .set('Authorization', `Bearer ${accessToken}`);

      const [actual] = await repo.find({ relations: { user: true } });

      const { id, username, email } = thing.user;
      const expectedThing: Thing = {
        ...thing,
        user: {
          id,
          username,
          email,
          hashedPassword: expect.any(String),
          hashedRefreshToken: expect.any(String),
          createDate: expect.any(Date),
          updateDate: expect.any(Date)
        }
      };
      expect(actual).toEqual(expectedThing);
    });
  });

  describe('GET /api/things', () => {
    it('should return OK status', async () => {
      const { accessToken } = await signUp(app);

      await request(app.getHttpServer())
        .get('/api/things')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);
    });

    it('should return a list of all things', async () => {
      const { accessToken, user } = await signUp(app);
      const n = 5;

      for (let i = 0; i < n; i++) {
        const thing: Partial<Thing> = {
          name: `name${i}`,
          description: `description${i}`,
          user
        };
        await repo.save(thing);
      }
      await request(app.getHttpServer())
        .get('/api/things')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(({ body }) => {
          expect(body.length).toEqual(n);
        });
    });
  });

  describe('GET /api/things/:id', () => {
    it('should return OK status', async () => {
      const { accessToken, user } = await signUp(app);
      const thing: Partial<Thing> = {
        name: 'a',
        description: 'b',
        user
      };
      const { id } = await repo.save(thing);

      await request(app.getHttpServer())
        .get(`/api/things/${id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);
    });

    it('should return NOT FOUND status if id does not exist', async () => {
      const { accessToken, user } = await signUp(app);
      const thing: Partial<Thing> = {
        name: 'a',
        description: 'b',
        user
      };
      const { id } = await repo.save(thing);

      let id2: string;
      while (!id2 || id2 === id) id2 = randomUUID();

      await request(app.getHttpServer())
        .get(`/api/things/${id2}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return a thing DTO if it exists', async () => {
      const { accessToken, user } = await signUp(app);
      const thing: Partial<Thing> = {
        name: 'a',
        description: 'b',
        user
      };
      const { id, name, description } = await repo.save(thing);

      await request(app.getHttpServer())
        .get(`/api/things/${id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(({ body }) => {
          expect(body.id).toEqual(id);
          expect(body.name).toEqual(name);
          expect(body.description).toEqual(description);
        });
    });
  });

  describe('PATCH /api/things/:id', () => {
    it('should return OK status', async () => {
      const { accessToken, user } = await signUp(app);
      const thing: Partial<Thing> = {
        name: 'a',
        description: 'b',
        user
      };
      const { id, name } = await repo.save(thing);
      const newName = `${name}1`;

      await request(app.getHttpServer())
        .patch(`/api/things/${id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: newName })
        .expect(HttpStatus.OK);
    });

    it('should update the database record', async () => {
      const { accessToken, user } = await signUp(app);
      const thing: Partial<Thing> = {
        name: 'a',
        description: 'b',
        user
      };
      const { id, name } = await repo.save(thing);
      const newName = `${name}1`;

      await request(app.getHttpServer())
        .patch(`/api/things/${id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: newName });

      const { name: actual } = await repo.findOneBy({ id });
      expect(actual).toEqual(newName);
    });
  });

  describe('DELETE /api/things/:id', () => {
    it('should return NO CONTENT status', async () => {
      const { accessToken, user } = await signUp(app);
      const thing: Partial<Thing> = {
        name: 'a',
        description: 'b',
        user
      };
      const { id } = await repo.save(thing);

      await request(app.getHttpServer())
        .delete(`/api/things/${id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.NO_CONTENT);
    });

    it('it should remove the thing record from the database', async () => {
      const { accessToken, user } = await signUp(app);
      const thing: Partial<Thing> = {
        name: 'a',
        description: 'b',
        user
      };
      const { id } = await repo.save(thing);

      await request(app.getHttpServer())
        .delete(`/api/things/${id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(await repo.findOneBy({ id })).toBeNull();
    });
  });
});
