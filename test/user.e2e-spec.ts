import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from 'src/app/app.module';
import { LogService } from 'src/log/log.service';
import { UserService } from 'src/auth/service/user.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/auth/entity/user.entity';
import { UserDto } from 'src/auth/dto/user/user.dto';
import { SignUpDto } from 'src/auth/dto/auth/sign-up.dto';
import { randomUUID } from 'crypto';
import { signUp } from './test-utils';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let repo: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [
        LogService,
        UserService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository<User>
        }
      ]
    }).compile();

    app = module.createNestApplication();
    repo = module.get<Repository<User>>(getRepositoryToken(User));
    await app.init();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await repo.query('DELETE FROM db_user');
    await app.close();
  });

  describe('GET /api/users', () => {
    it('should require an access token', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return OK status', async () => {
      const { accessToken } = await signUp(app);

      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);
    });

    it('should return a list of all user DTOs', async () => {
      const n = 5;
      let accessToken: string;

      for (let i = 0; i < n; i++) {
        const dto: SignUpDto = {
          username: `username${i}`,
          email: `username${i}@email.com`,
          password: 'password'
        };
        accessToken = (await signUp(app, dto)).accessToken;
      }
      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(({ body }) => {
          expect(body.length).toEqual(n);
        });
    });
  });

  describe('GET /api/users/:id', () => {
    it('should require an access token', async () => {
      const { id } = await signUp(app);

      await request(app.getHttpServer())
        .get(`/api/users/${id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return OK status', async () => {
      const { accessToken, id } = await signUp(app);

      await request(app.getHttpServer())
        .get(`/api/users/${id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);
    });

    it('should return NOT FOUND status if id does not exist', async () => {
      const { accessToken, id } = await signUp(app);

      let id2: string;
      while (!id2 || id2 === id) id2 = randomUUID();

      await request(app.getHttpServer())
        .get(`/api/users/${id2}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return a user DTO if it exists', async () => {
      const { accessToken, id, username, email } = await signUp(app);
      const dto: UserDto = { id, username, email };

      await request(app.getHttpServer())
        .get(`/api/users/${id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(({ body }) => {
          expect(body).toEqual(dto);
        });
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('should require an access token', async () => {
      const { id, username } = await signUp(app);
      const newUsername = `${username}1`;

      await request(app.getHttpServer())
        .patch(`/api/users/${id}`)
        .send({ username: newUsername })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return OK status', async () => {
      const { accessToken, id, username } = await signUp(app);
      const newUsername = `${username}1`;

      await request(app.getHttpServer())
        .patch(`/api/users/${id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ username: newUsername })
        .expect(HttpStatus.OK);
    });

    it('should update the database record', async () => {
      const { accessToken, id, username } = await signUp(app);
      const newUsername = `${username}1`;

      await request(app.getHttpServer())
        .patch(`/api/users/${id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ username: newUsername });

      const { username: actual } = await repo.findOneBy({ id });
      expect(actual).toEqual(newUsername);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should require an access token', async () => {
      const { id } = await signUp(app);

      await request(app.getHttpServer())
        .delete(`/api/users/${id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return NO CONTENT status', async () => {
      const { accessToken, id } = await signUp(app);

      await request(app.getHttpServer())
        .delete(`/api/users/${id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.NO_CONTENT);
    });

    it('should remove the user record from the database', async () => {
      const { accessToken, id } = await signUp(app);

      await request(app.getHttpServer())
        .delete(`/api/users/${id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      const actual = await repo.findOneBy({ id });
      expect(actual).toBeNull();
    });
  });
});
