import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { HealthService } from '../src/health/health.service';
import { ConfigService } from '@nestjs/config';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ' - ' + detail : ''}`);
    failed++;
  }
}

async function runServiceHealthVerification() {
  console.log('========================================================================');
  console.log('🧪 SamadhanSetu Reliability Suite 6: Service Health, Readiness & Observability');
  console.log('========================================================================\n');

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/(.*)', 'api/health', 'api/health/(.*)'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  await app.listen(0);
  const server = app.getHttpServer();
  const address = server.address();
  const port = typeof address === 'string' ? 3001 : address.port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  const healthService = app.get(HealthService);

  try {
    // -------------------------------------------------------------------------
    // Check 1: Comprehensive Health Probe
    // -------------------------------------------------------------------------
    console.log('▶ CHECK 1: Verifying Comprehensive GET /api/health Payload...');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();

    assert(healthRes.status === 200, 'GET /api/health returns HTTP 200');
    assert(healthData.status === 'ok', 'Status is "ok"');
    assert(['ready', 'degraded'].includes(healthData.readiness), `Readiness is valid: "${healthData.readiness}"`);
    assert(healthData.database?.status === 'connected', 'Database status reports "connected"');
    assert(typeof healthData.ai_service === 'object', 'AI service diagnostic object present');

    // -------------------------------------------------------------------------
    // Check 2: Liveness Probe (/api/health/live)
    // -------------------------------------------------------------------------
    console.log('\n▶ CHECK 2: Verifying GET /api/health/live Probe...');
    const liveRes = await fetch(`${baseUrl}/health/live`);
    const liveData = await liveRes.json();

    assert(liveRes.status === 200, 'GET /api/health/live returns HTTP 200');
    assert(liveData.status === 'ok', 'Status is "ok"');
    assert(typeof liveData.timestamp === 'string', 'Timestamp is present');

    // -------------------------------------------------------------------------
    // Check 3: Readiness Probe (/api/health/ready) Under Connected DB
    // -------------------------------------------------------------------------
    console.log('\n▶ CHECK 3: Verifying GET /api/health/ready Under Connected DB...');
    const readyRes = await fetch(`${baseUrl}/health/ready`);
    const readyData = await readyRes.json();

    assert(readyRes.status === 200, 'GET /api/health/ready returns HTTP 200');
    assert(['ready', 'degraded'].includes(readyData.status), `Readiness status is valid: "${readyData.status}"`);
    assert(readyData.database === 'connected', 'Database reported as connected');

    // -------------------------------------------------------------------------
    // Check 4: Correlation ID Propagation & Auto-Generation
    // -------------------------------------------------------------------------
    console.log('\n▶ CHECK 4: Verifying Correlation ID Middleware Headers...');
    const clientCorrId = `client-test-id-${Date.now()}`;
    const corrRes = await fetch(`${baseUrl}/health/live`, {
      headers: { 'X-Correlation-Id': clientCorrId },
    });
    assert(corrRes.headers.get('x-correlation-id') === clientCorrId, 'Supplied X-Correlation-Id echoed in response header');

    const autoCorrRes = await fetch(`${baseUrl}/health/live`);
    const generatedCorrId = autoCorrRes.headers.get('x-correlation-id');
    assert(typeof generatedCorrId === 'string' && generatedCorrId.length > 5, 'Auto-generated correlation ID attached when omitted');

    // -------------------------------------------------------------------------
    // Check 5: Root-Level GET /health (Prefix Exclusion Verification)
    // -------------------------------------------------------------------------
    console.log('\n▶ CHECK 5: Verifying Root-Level GET /health Endpoint...');
    const rootRes = await fetch(`http://127.0.0.1:${port}/health`);
    assert(rootRes.status === 200, 'GET /health (without /api prefix) returns HTTP 200');
    const rootData = await rootRes.json();
    assert(rootData.database?.status === 'connected', 'Root /health reports database connected');

    // -------------------------------------------------------------------------
    // Check 6: Real Unit Verification of HealthService with DB Failure
    // -------------------------------------------------------------------------
    console.log('\n▶ CHECK 6: Verifying HealthService DB Disconnect Failure Handling...');
    const mockDbFailDataSource = {
      isInitialized: true,
      query: async () => { throw new Error('Simulated database connection loss'); },
    } as any;
    const configService = app.get(ConfigService);
    const simulatedHealthService = new HealthService(configService, mockDbFailDataSource);
    const disconnectedResult = await simulatedHealthService.checkHealth();

    assert(disconnectedResult.readiness === 'unavailable', 'DB disconnect correctly triggers readiness: unavailable');
    assert(disconnectedResult.database.status === 'disconnected', 'DB disconnect correctly sets database.status: disconnected');
  } finally {
    await app.close();
  }

  console.log('\n========================================================================');
  console.log(`📊 Suite 6 Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runServiceHealthVerification().catch((err) => {
  console.error('Fatal error in verify-service-health:', err);
  process.exit(1);
});
