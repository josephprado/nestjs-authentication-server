import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { LogModule } from 'src/log/log.module';
import { AuthController } from './controller/auth.controller';
import { AuthService } from './service/auth.service';
import { UserController } from './controller/user.controller';
import { UserService } from './service/user.service';
import { UserMapper } from './mapper/user.mapper';
import { User } from './entity/user.entity';

/**
 * Provides services related to authentication and authorization
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({ global: true }),
    LogModule
  ],
  controllers: [AuthController, UserController],
  providers: [AuthService, UserService, UserMapper],
  exports: [UserService]
})
export class AuthModule {}
