import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { validateEnvironment } from './config/env.validation';

async function bootstrap() {
  const envValidation = validateEnvironment();
  if (!envValidation.valid) {
    Logger.error('❌ Environment validation failed. Halting application.', 'Bootstrap');
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const appName =
    configService.get<string>('app.appName') ||
    configService.get<string>('APP_NAME') ||
    'ResolvIN';

  // Configure global API versioned prefix with root health exclusion
  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/(.*)', 'api/health', 'api/health/(.*)'],
  });

  // Enforce DTO validation and strip unwhitelisted fields (e.g. self-assigned roles)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // Enable CORS with environment-driven allowed origins and credential safety
  const rawCorsOrigin = configService.get<string>('app.corsOrigin', '*');
  const corsConfig =
    rawCorsOrigin && rawCorsOrigin !== '*'
      ? rawCorsOrigin.includes(',')
        ? rawCorsOrigin.split(',').map((o) => o.trim())
        : rawCorsOrigin.trim()
      : (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
          // Allow all origins with credentials by echoing back the requesting origin
          callback(null, true);
        };

  app.enableCors({
    origin: corsConfig,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = configService.get<number>('app.port', 3001);

  // Configure HTTP server keep-alive timeouts for mobile clients (Android OkHttp connection pool)
  const httpServer = app.getHttpServer();
  if (httpServer) {
    httpServer.keepAliveTimeout = 65000;
    httpServer.headersTimeout = 66000;
  }

  await app.listen(port, '0.0.0.0');

  Logger.log(`🚀 [${appName}] Backend running on: http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`🏥 Health check available at: http://localhost:${port}/api/health`, 'Bootstrap');
}
bootstrap();
