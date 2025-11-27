import { User } from '@/app/users/entities/user.entity';

import { AppDataSource } from '@/database/ormconfig';

import { FactorizedAttrs, Factory } from '@jorgebodega/typeorm-factory';
import { randEmail, randFirstName, randLastName } from '@ngneat/falso';
import * as bcrypt from 'bcrypt';

export class UserFactory extends Factory<User> {
  protected entity = User;
  protected dataSource = AppDataSource;
  protected attrs(): FactorizedAttrs<User> {
    return {
      email: randEmail(),
      firstName: randFirstName(),
      lastName: randLastName(),
      emailVerified: false,
      password: async () => await bcrypt.hash('password123', 10),
    };
  }
}
