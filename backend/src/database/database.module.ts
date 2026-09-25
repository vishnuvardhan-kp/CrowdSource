import { Module, Logger, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from './entities';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const host = configService.get<string>('DATABASE_HOST', 'localhost');
        const port = configService.get<number>('DATABASE_PORT', 5432);
        const username = configService.get<string>('DATABASE_USER', 'postgres');
        const password = configService.get<string>('DATABASE_PASSWORD', 'postgres_password');
        const database = configService.get<string>('DATABASE_NAME', 'samadhan_setu');
        const isDev = configService.get<string>('NODE_ENV', 'development') === 'development';
        const isSsl =
          configService.get<string>('DATABASE_SSL') === 'true' ||
          (Boolean(databaseUrl) && databaseUrl.includes('sslmode=require'));

        const conn = databaseUrl
          ? {
              type: 'postgres' as const,
              url: databaseUrl,
              ssl: isSsl ? { rejectUnauthorized: false } : false,
            }
          : {
              type: 'postgres' as const,
              host,
              port,
              username,
              password,
              database,
              ssl: isSsl ? { rejectUnauthorized: false } : false,
            };

        return {
          ...conn,
          entities: ALL_ENTITIES,
          synchronize: false, // Migrations manage database schema
          logging: isDev ? ['error', 'warn'] : false,
          extra: {
            client_encoding: 'UTF8',
          },
          retryAttempts: 1,
          retryDelay: 0,
        };
      },
      dataSourceFactory: async (options) => {
        const logger = new Logger('DatabaseModule');
        if (!options) {
          throw new Error('Invalid TypeORM options passed to dataSourceFactory');
        }
        const dataSource = new DataSource(options);

        const maxAttempts = 10;
        let attempt = 0;
        let delayMs = 500;
        let lastError: Error | null = null;

        while (attempt < maxAttempts) {
          attempt++;
          try {
            await dataSource.initialize();
            logger.log(
              `✅ Connected to PostgreSQL database: ${options.database} at ${(options as any).host}:${(options as any).port} (attempt ${attempt}/${maxAttempts})`,
            );
            return dataSource;
          } catch (error: any) {
            lastError = error;
            if (attempt < maxAttempts) {
              logger.warn(
                `⏳ PostgreSQL not ready at ${(options as any).host}:${(options as any).port} (attempt ${attempt}/${maxAttempts}: ${error.message}). Retrying in ${delayMs}ms...`,
              );
              await new Promise((res) => setTimeout(res, delayMs));
              delayMs = Math.min(delayMs * 1.5, 2000);
            }
          }
        }

        // FAIL CLOSED: Never fake isInitialized or boot into a corrupt uninitialized state
        logger.error(
          `❌ Failed to establish PostgreSQL connection after ${maxAttempts} attempts at ${(options as any).host}:${(options as any).port}: ${lastError?.message}. Halting application bootstrap (FAIL CLOSED).`,
        );
        throw new Error(
          `Database connection could not be established. Halting bootstrap: ${lastError?.message}`,
        );
      },
    }),
  ],
  providers: [
    {
      provide: DATABASE_CONNECTION,
      inject: [DataSource],
      useFactory: (dataSource: DataSource) => dataSource,
    },
  ],
  exports: [TypeOrmModule, DATABASE_CONNECTION],
})
export class DatabaseModule {}
