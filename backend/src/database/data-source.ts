import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { ALL_ENTITIES } from './entities';

// Load environment variables from .env / .env.local / root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const databaseUrl = process.env.DATABASE_URL;
const isSsl =
  process.env.DATABASE_SSL === 'true' ||
  (Boolean(databaseUrl) && databaseUrl.includes('sslmode=require'));

const connectionOptions = databaseUrl
  ? {
      type: 'postgres' as const,
      url: databaseUrl,
      ssl: isSsl ? { rejectUnauthorized: false } : false,
    }
  : {
      type: 'postgres' as const,
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres_password',
      database: process.env.DATABASE_NAME || 'samadhan_setu',
      ssl: isSsl ? { rejectUnauthorized: false } : false,
    };

export const AppDataSource = new DataSource({
  ...connectionOptions,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: ALL_ENTITIES,
  migrations: [path.join(__dirname, 'migrations', '*{.ts,.js}')],
  migrationsTransactionMode: 'each',
});

