import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';

@Controller(['', 'api', 'health', 'api/health'])
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(@Res() res: Response) {
    const health = await this.healthService.checkHealth();
    const httpStatus =
      health.database.status === 'connected'
        ? HttpStatus.OK
        : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(httpStatus).json(health);
  }

  @Get('live')
  getLiveness() {
    return { status: 'ok', liveness: true, timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async getReadiness(@Res() res: Response) {
    const health = await this.healthService.checkHealth();
    const httpStatus =
      health.database.status === 'connected'
        ? HttpStatus.OK
        : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(httpStatus).json({
      status: health.readiness,
      database: health.database.status,
      ai_service: health.ai_service.status,
      timestamp: health.timestamp,
    });
  }
}
