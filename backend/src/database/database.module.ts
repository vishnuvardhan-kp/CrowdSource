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
        const host = configService.get<string>('DATABASE_HOST', 'localhost');
        const port = configService.get<number>('DATABASE_PORT', 5432);
        const username = configService.get<string>('DATABASE_USER', 'postgres');
        const password = configService.get<string>('DATABASE_PASSWORD', 'postgres_password');
        const database = configService.get<string>('DATABASE_NAME', 'samadhan_setu');
        const isDev = configService.get<string>('NODE_ENV', 'development') === 'development';

        return {
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          entities: ALL_ENTITIES,
          synchronize: false, // Migrations manage database schema
          logging: isDev ? ['error', 'warn'] : false,
          retryAttempts: 1,
          retryDelay: 500,
          extra: {
            client_encoding: 'UTF8',
          },
        };
      },
      dataSourceFactory: async (options) => {
        const logger = new Logger('DatabaseModule');
        if (!options) {
          throw new Error('Invalid TypeORM options passed to dataSourceFactory');
        }
        const dataSource = new DataSource(options);
        try {
          await dataSource.initialize();
          logger.log(
            `✅ Connected to PostgreSQL database: ${options.database} at ${(options as any).host}:${(options as any).port}`
          );
          return dataSource;
        } catch (error) {
          logger.warn(
            `⚠️ Could not establish initial PostgreSQL connection (${(options as any).host}:${(options as any).port}): ${error.message}. App starting in standalone mode.`
          );
          try {
            (dataSource as any).buildMetadatas();
          } catch {}
          (dataSource as any).isInitialized = true;
          return dataSource;
        }
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
