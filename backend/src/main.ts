import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const appName =
    configService.get<string>('app.appName') ||
    configService.get<string>('APP_NAME') ||
    'SamadhanPlatform';

  // Configure global API versioned prefix
  app.setGlobalPrefix('api');

  // Enforce DTO validation and strip unwhitelisted fields (e.g. self-assigned roles)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // Enable CORS for frontend integration
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = configService.get<number>('app.port', 3001);
  await app.listen(port);

  Logger.log(`🚀 [${appName}] Backend running on: http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`🏥 Health check available at: http://localhost:${port}/api/health`, 'Bootstrap');
}
bootstrap();
