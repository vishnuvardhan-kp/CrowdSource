import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  url?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

export default registerAs('database', (): DatabaseConfig => {
  const url = process.env.DATABASE_URL;
  const isSsl =
    process.env.DATABASE_SSL === 'true' ||
    (Boolean(url) && url.includes('sslmode=require'));
  return {
    url,
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres_password',
    database: process.env.DATABASE_NAME || 'samadhan_setu',
    ssl: isSsl ? { rejectUnauthorized: false } : undefined,
  };
});
