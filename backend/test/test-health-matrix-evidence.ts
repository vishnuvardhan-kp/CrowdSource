import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { HealthService } from '../src/health/health.service';
import { ConfigService } from '@nestjs/config';

async function runHealthMatrixEvidence() {
  console.log('========================================================================');
  console.log('🧪 HEALTH & READINESS MATRIX: Runtime Evidence Verification');
  console.log('========================================================================\n');

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/(.*)', 'api/health', 'api/health/(.*)'],
  });
  await app.listen(0);

  const server = app.getHttpServer();
  const address = server.address();
  const port = typeof address === 'string' ? 3001 : address.port;
  const configService = app.get(ConfigService);

  try {
    // -------------------------------------------------------------------------
    // TEST D & E: Verify /health and /api/health Response Identicality
    // -------------------------------------------------------------------------
    console.log('▶ CHECK D & E: Testing Dual-Mount /health and /api/health Endpoints...');
    const rootHealthRes = await fetch(`http://127.0.0.1:${port}/health`);
    const rootHealthJson = await rootHealthRes.json();
    console.log(`[GET /health] Status Code: ${rootHealthRes.status}`);
    console.log(`[GET /health] Body:\n`, JSON.stringify(rootHealthJson, null, 2));

    const apiHealthRes = await fetch(`http://127.0.0.1:${port}/api/health`);
    const apiHealthJson = await apiHealthRes.json();
    console.log(`\n[GET /api/health] Status Code: ${apiHealthRes.status}`);
    console.log(`[GET /api/health] Body:\n`, JSON.stringify(apiHealthJson, null, 2));

    // -------------------------------------------------------------------------
    // TEST A: Database Unavailable -> Backend NOT READY (HTTP 503 / unavailable)
    // -------------------------------------------------------------------------
    console.log('\n▶ CHECK A: Simulating Database Unavailable (DB Connection Loss)...');
    const mockDisconnectedDataSource = {
      isInitialized: true,
      query: async () => { throw new Error('Simulated DB connection failure'); },
    } as any;

    const dbFailHealthService = new HealthService(configService, mockDisconnectedDataSource);
    const dbFailResult = await dbFailHealthService.checkHealth();
    console.log(`[DB Disconnect Probe] Readiness: ${dbFailResult.readiness}`);
    console.log(`[DB Disconnect Probe] Database Status: ${dbFailResult.database.status}`);
    console.log(`[DB Disconnect Probe] Full Object:\n`, JSON.stringify(dbFailResult, null, 2));

    // -------------------------------------------------------------------------
    // TEST B: Database Healthy + AI Service Unavailable -> Backend READY (DEGRADED)
    // -------------------------------------------------------------------------
    console.log('\n▶ CHECK B: Database Healthy + AI Service Port Closed...');
    const mockOfflineAiConfig = {
      get: (key: string, def?: any) => {
        if (key === 'AI_SERVICE_URL' || key === 'app.aiServiceUrl') return 'http://127.0.0.1:59999';
        return configService.get(key, def);
      },
    } as any;

    const normalDataSource = app.get(HealthService)['dataSource'];
    const aiOfflineHealthService = new HealthService(mockOfflineAiConfig, normalDataSource);
    const aiOfflineResult = await aiOfflineHealthService.checkHealth();
    console.log(`[AI Offline Probe] Readiness: ${aiOfflineResult.readiness}`);
    console.log(`[AI Offline Probe] Database Status: ${aiOfflineResult.database.status}`);
    console.log(`[AI Offline Probe] AI Status: ${aiOfflineResult.ai_service.status}`);
    console.log(`[AI Offline Probe] Full Object:\n`, JSON.stringify(aiOfflineResult, null, 2));

    // -------------------------------------------------------------------------
    // TEST C: NVIDIA Unavailable -> Core Backend Readiness DOES NOT FAIL
    // -------------------------------------------------------------------------
    console.log('\n▶ CHECK C: Simulating NVIDIA Unavailable / Degraded AI Provider...');
    // When FastAPI reports provider_available: false (degraded)
    const originalFetch = global.fetch;
    global.fetch = async (url: any, init?: any) => {
      if (typeof url === 'string' && url.includes('/health')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'degraded',
            service: 'samadhansetu-ai-service',
            provider: 'nvidia',
            provider_available: false,
          }),
        } as any;
      }
      return originalFetch(url, init);
    };

    const nvidiaDegradedHealthService = new HealthService(configService, normalDataSource);
    const nvidiaDegradedResult = await nvidiaDegradedHealthService.checkHealth();
    console.log(`[NVIDIA Degraded Probe] Readiness: ${nvidiaDegradedResult.readiness}`);
    console.log(`[NVIDIA Degraded Probe] Database Status: ${nvidiaDegradedResult.database.status}`);
    console.log(`[NVIDIA Degraded Probe] AI Status: ${nvidiaDegradedResult.ai_service.status}`);
    console.log(`[NVIDIA Degraded Probe] Full Object:\n`, JSON.stringify(nvidiaDegradedResult, null, 2));

    global.fetch = originalFetch;
  } finally {
    await app.close();
  }
}

runHealthMatrixEvidence().catch((err) => {
  console.error('Fatal in health matrix evidence:', err);
  process.exit(1);
});
