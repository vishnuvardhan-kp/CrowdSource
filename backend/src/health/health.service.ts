import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

export interface HealthCheckResult {
  status: string;
  readiness: 'ready' | 'degraded' | 'unavailable';
  appName: string;
  service: string;
  database: {
    status: 'connected' | 'disconnected';
    type: string;
  };
  ai_service: {
    status: 'available' | 'degraded' | 'unavailable';
    provider: string;
    endpoint: string;
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
      'ResolvIN';

    const serviceSlug = `${appName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-backend`;

    let isDbConnected = false;
    try {
      if (this.dataSource && this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        isDbConnected = true;
      }
    } catch {
      isDbConnected = false;
    }

    const aiEndpoint =
      this.configService.get<string>('AI_SERVICE_URL') ||
      this.configService.get<string>('app.aiServiceUrl') ||
      'http://127.0.0.1:8000';

    let aiStatus: 'available' | 'degraded' | 'unavailable' = 'unavailable';
    let aiProvider = 'unknown';

    try {
      const res = await fetch(`${aiEndpoint}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const aiData = await res.json();
        aiStatus = aiData.provider_available === false ? 'degraded' : 'available';
        aiProvider = aiData.provider || 'unknown';
      } else {
        aiStatus = 'degraded';
      }
    } catch {
      aiStatus = 'unavailable';
    }

    const readiness: 'ready' | 'degraded' | 'unavailable' = !isDbConnected
      ? 'unavailable'
      : aiStatus === 'available'
        ? 'ready'
        : 'degraded';

    return {
      status: 'ok',
      readiness,
      appName,
      service: serviceSlug,
      database: {
        status: isDbConnected ? 'connected' : 'disconnected',
        type: 'postgres',
      },
      ai_service: {
        status: aiStatus,
        provider: aiProvider,
        endpoint: aiEndpoint,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async checkReadiness(): Promise<HealthCheckResult> {
    const result = await this.checkHealth();
    return result;
  }
}
