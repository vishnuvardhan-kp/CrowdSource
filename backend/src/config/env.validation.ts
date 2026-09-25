import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface EnvValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export function validateEnvironment(throwOnError: boolean = false): EnvValidationResult {
  const logger = new Logger('EnvironmentValidator');
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required DB parameters
  const dbHost = process.env.DATABASE_HOST || 'localhost';
  const dbPort = process.env.DATABASE_PORT || '5432';
  const dbName = process.env.DATABASE_NAME || 'samadhan_setu';
  const dbUser = process.env.DATABASE_USER || 'postgres';

  if (!dbHost) errors.push('DATABASE_HOST must not be empty.');
  if (isNaN(parseInt(dbPort, 10))) errors.push(`DATABASE_PORT "${dbPort}" is not a valid number.`);
  if (!dbName) errors.push('DATABASE_NAME must not be empty.');
  if (!dbUser) errors.push('DATABASE_USER must not be empty.');

  // JWT Secret
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    if (process.env.NODE_ENV === 'production') {
      errors.push('JWT_SECRET is required and must be securely set in production.');
    } else {
      warnings.push('JWT_SECRET is using default development secret key.');
    }
  }

  // AI Provider & Keys
  const aiProvider = (process.env.AI_PROVIDER || 'nvidia').toLowerCase().trim();
  const nvidiaKey = (process.env.NVIDIA_API_KEY || '').trim();

  if (aiProvider === 'nvidia' && !nvidiaKey) {
    warnings.push(
      'AI_PROVIDER is configured as "nvidia" but NVIDIA_API_KEY is not set. FastAPI AI service will operate in degraded mode using MockAIProvider.',
    );
  }

  // Required directories
  const uploadDir = path.resolve(process.cwd(), 'uploads');
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const evidenceDir = path.join(uploadDir, 'evidence');
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
  } catch (err: any) {
    errors.push(`Failed to verify or create upload directory "${uploadDir}": ${err.message}`);
  }

  for (const warn of warnings) {
    logger.warn(`⚠️ [Config Warning] ${warn}`);
  }

  if (errors.length > 0) {
    for (const err of errors) {
      logger.error(`❌ [Config Error] ${err}`);
    }
    if (throwOnError) {
      throw new Error(`Environment validation failed: ${errors.join('; ')}`);
    }
    return { valid: false, warnings, errors };
  }

  logger.log('✅ Core environment configuration validated successfully.');
  return { valid: true, warnings, errors };
}
