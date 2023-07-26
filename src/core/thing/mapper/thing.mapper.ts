import { Injectable } from '@nestjs/common';
import { UserService } from 'src/auth/service/user.service';
import { Thing } from '../entity/thing.entity';
import { ThingDto } from '../dto/thing.dto';
import { ThingCreateDto } from '../dto/thing-create.dto';

/**
 * Maps between thing entities and DTOs
 */
@Injectable()
export class ThingMapper {
  constructor(private readonly USER_SVC: UserService) {}

  /**
   * Converts a thing entity to a thing DTO
   *
   * @param thing A thing
   * @returns A thing DTO
   */
  thingToDto(thing: Thing): ThingDto {
    return {
      id: thing.id,
      name: thing.name,
      description: thing.description
    };
  }

  /**
   * Converts a thing-create DTO to a thing
   *
   * @param userId A user id
   * @param dto A thing-create DTO
   * @returns A thing
   */
  async createToThing(userId: string, dto: ThingCreateDto): Promise<Thing> {
    const thing = new Thing();
    thing.name = dto.name;
    thing.description = dto.description;
    thing.user = await this.USER_SVC.findOneById(userId);
    return thing;
  }
}
