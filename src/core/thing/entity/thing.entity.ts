import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { UserOwned } from 'src/auth/entity/user-owned.entity';
import { IsNotEmpty } from 'class-validator';

/**
 * Represents a thing owned by a user
 */
@Entity()
@Unique('UQ__THING__NAME__USER', ['name', 'user'])
export class Thing extends UserOwned {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @IsNotEmpty()
  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;
}
