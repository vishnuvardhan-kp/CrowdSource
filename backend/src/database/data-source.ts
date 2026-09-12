import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { ALL_ENTITIES } from './entities';

// Load environment variables from .env / .env.local / root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres_password',
  database: process.env.DATABASE_NAME || 'samadhan_setu',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: ALL_ENTITIES,
  migrations: [path.join(__dirname, 'migrations', '*{.ts,.js}')],
  migrationsTransactionMode: 'each',
});
