import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

export interface HealthCheckResult {
  status: string;
  appName: string;
  service: string;
  database: {
    status: 'connected' | 'disconnected';
    type: string;
  };
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async checkHealth(): Promise<HealthCheckResult> {
    const appName =
      this.configService.get<string>('APP_NAME') ||
      this.configService.get<string>('app.appName') ||
      'SamadhanPlatform';

    const serviceSlug = `${appName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-backend`;

    let isDbConnected = false;
    try {
      if (this.dataSource && this.dataSource.isInitialized) {
        // Ping database with a simple query
        await this.dataSource.query('SELECT 1');
        isDbConnected = true;
      }
    } catch {
      isDbConnected = false;
    }

    return {
      status: 'ok',
      appName,
      service: serviceSlug,
      database: {
        status: isDbConnected ? 'connected' : 'disconnected',
        type: 'postgres',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
