import 'reflect-metadata';
import configuration from '@/config/configuration';

import { DataSource } from 'typeorm';

const isSqlite = configuration.TYPEORM_CONNECTION === 'sqlite';

export const AppDataSource = new DataSource(
  isSqlite
    ? {
        type: 'sqlite',
        database: configuration.TYPEORM_URL,
        synchronize: configuration.TYPEORM_SYNCHRONIZE,
        migrations: [configuration.TYPEORM_MIGRATIONS],
        entities: [configuration.TYPEORM_ENTITIES],
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
        synchronize: configuration.TYPEORM_SYNCHRONIZE,
        migrations: [configuration.TYPEORM_MIGRATIONS],
        entities: [configuration.TYPEORM_ENTITIES],
      },
);
