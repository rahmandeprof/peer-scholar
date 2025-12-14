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
        // Connection pool settings for production
        max: parseInt(process.env.DB_POOL_MAX ?? '20'), // Max connections (Render free = 25 limit)
        min: parseInt(process.env.DB_POOL_MIN ?? '2'),  // Min connections to keep warm
        idleTimeoutMillis: 30000, // Close idle connections after 30s
        connectionTimeoutMillis: 5000, // Fail fast if can't connect
      },
      synchronize:
        configuration.NODE_ENV === 'production'
          ? false
          : configuration.TYPEORM_SYNCHRONIZE,
      migrationsRun: configuration.NODE_ENV === 'production',
      migrations: [configuration.TYPEORM_MIGRATIONS],
      entities: [configuration.TYPEORM_ENTITIES],
      namingStrategy: new SnakeCaseNamingStrategy(),
      // Enable query logging in dev for debugging
      logging: configuration.NODE_ENV !== 'production' ? ['query', 'error'] : ['error'],
    },
);

