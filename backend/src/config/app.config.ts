import { registerAs } from '@nestjs/config';

export interface AppConfig {
  appName: string;
  port: number;
  nodeEnv: string;
  aiServiceUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
}

export default registerAs('app', (): AppConfig => ({
  appName: process.env.APP_NAME || 'SamadhanPlatform',
  port: parseInt(process.env.PORT || process.env.BACKEND_PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-key-change-in-prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
}));
