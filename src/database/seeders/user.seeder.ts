import { User } from '@/app/users/entities/user.entity';

import configuration from '@/config/configuration';
import { UserFactory } from '@/database/factories/user.factory';

import { Seeder } from '@jorgebodega/typeorm-seeding';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

export default class UserSeeder extends Seeder {
  async run(dataSource: DataSource) {
    const entityManager = dataSource.createEntityManager();

    const existingSuperAdmin = await entityManager.findOne(User, {
      where: { email: configuration.SUPER_ADMIN_EMAIL },
    });

    if (!existingSuperAdmin) {
      const hashedPassword = await bcrypt.hash(
        configuration.SUPER_ADMIN_PASSWORD,
        10,
      );
      const superAdmin = entityManager.create(User, {
        firstName: 'Dev',
        lastName: 'Admin',
        email: configuration.SUPER_ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
        emailVerified: true,
      });

      await entityManager.save(superAdmin);
    }

    await new UserFactory().createMany(20);
  }
}
