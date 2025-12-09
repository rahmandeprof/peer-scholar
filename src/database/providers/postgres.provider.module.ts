import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppDataSource } from '@/database/ormconfig';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { entities, ...rest } = AppDataSource.options;

        return {
          ...rest,
          autoLoadEntities: true,
        };
      },
    }),
  ],
})
export class PostgresDatabaseProviderModule {}
