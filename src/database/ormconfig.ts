import 'reflect-metadata';
import configuration from '@/config/configuration';

import { DataSource } from 'typeorm';
import { SnakeCaseNamingStrategy } from './snake-case-naming.strategy';

const isSqlite = configuration.TYPEORM_CONNECTION === 'sqlite';

export const AppDataSource = new DataSource(
  isSqlite
    ? {
      type: 'sqlite',
      database: configuration.TYPEORM_URL,
      synchronize: configuration.TYPEORM_SYNCHRONIZE,
      migrations: [configuration.TYPEORM_MIGRATIONS],
      entities: [configuration.TYPEORM_ENTITIES],
      namingStrategy: new SnakeCaseNamingStrategy(),
    }
    : {
      type: 'postgres',
      url: configuration.TYPEORM_URL,
      extra: {
        charset: configuration.TYPEORM_CHARSET,
        ssl: {
          rejectUnauthorized: false,
          requestCert: true,
        },
      },
      synchronize:
        configuration.NODE_ENV === 'production'
          ? false
          : configuration.TYPEORM_SYNCHRONIZE,
      migrationsRun: configuration.NODE_ENV === 'production',
      migrations: [configuration.TYPEORM_MIGRATIONS],
      entities: [configuration.TYPEORM_ENTITIES],
      namingStrategy: new SnakeCaseNamingStrategy(),
    },
);

