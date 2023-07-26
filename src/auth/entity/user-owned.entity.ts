import { Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Base } from 'src/shared/entity/base.entity';
import { User } from './user.entity';

/**
 * Represents an entity owned by a specific user
 */
@Entity()
export abstract class UserOwned extends Base {
  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
    nullable: false
  })
  @JoinColumn({ foreignKeyConstraintName: 'FK__USER_OWNED__USER' })
  user: User;
}
