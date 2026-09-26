import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { HealthService } from '../src/health/health.service';
import { validateEnvironment } from '../src/config/env.validation';

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

async function runStartupReliabilityVerification() {
  console.log('========================================================================');
  console.log('🧪 SamadhanSetu Reliability Suite 1: Startup & Liveness/Readiness Semantics');
  console.log('========================================================================\n');

  // Test 1: Environment Validation Guard
  console.log('▶ STEP 1: Verifying Environment Validation Guard (Fail Fast)...');
  try {
    const originalPort = process.env.DATABASE_PORT;
    process.env.DATABASE_PORT = 'invalid_port_string';
    let threw = false;
    try {
      validateEnvironment(true);
    } catch (e: any) {
      threw = true;
      assert(e.message.includes('DATABASE_PORT'), 'Throws explicit error when DATABASE_PORT is invalid');
    }
    assert(threw, 'validateEnvironment fails fast when mandatory env var is invalid');
    process.env.DATABASE_PORT = originalPort;
  } catch (err: any) {
    assert(false, 'Environment validation test error', err.message);
  }

  // Test 2: In-Memory NestJS Application Cold Boot
  console.log('\n▶ STEP 2: Booting NestJS Application with Fail-Closed DB Initialization...');
  let app: INestApplication | null = null;
  let baseUrl = '';

  try {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
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
    baseUrl = `http://127.0.0.1:${port}/api`;

    assert(true, 'NestJS application cold boot successful on port ' + port);
  } catch (err: any) {
    assert(false, 'NestJS cold boot failed', err.message);
    process.exit(1);
  }

  // Test 3: Liveness Probe (/api/health/live)
  console.log('\n▶ STEP 3: Verifying Liveness Probe (/api/health/live)...');
  try {
    const res = await fetch(`${baseUrl}/health/live`);
    const data = await res.json();
    assert(res.status === 200, 'Liveness probe returns HTTP 200');
    assert(data.status === 'ok', 'Liveness probe status is "ok"');
    assert(typeof data.timestamp === 'string', 'Liveness probe contains ISO timestamp');
  } catch (err: any) {
    assert(false, 'Liveness probe error', err.message);
  }

  // Test 4: Readiness Probe (/api/health/ready)
  console.log('\n▶ STEP 4: Verifying Readiness Probe (/api/health/ready)...');
  try {
    const res = await fetch(`${baseUrl}/health/ready`);
    const data = await res.json();
    assert(res.status === 200, 'Readiness probe returns HTTP 200 when DB connected');
    assert(data.status === 'ready' || data.status === 'degraded', `Readiness status is "${data.status}"`);
    assert(data.database === 'connected', 'Database reported as connected');
  } catch (err: any) {
    assert(false, 'Readiness probe error', err.message);
  }

  // Test 5: Full Health Diagnostic Report (/api/health)
  console.log('\n▶ STEP 5: Verifying Comprehensive Health Diagnostic (/api/health)...');
  try {
    const res = await fetch(`${baseUrl}/health`);
    const data = await res.json();
    assert(res.status === 200, 'Full health returns HTTP 200');
    assert(data.database?.status === 'connected', 'Health report confirms database connected');
    assert(typeof data.ai_service === 'object', 'AI service status object present');
    assert(typeof data.readiness === 'string', 'Readiness is reported');
    assert(typeof data.timestamp === 'string', 'Timestamp is reported');
  } catch (err: any) {
    assert(false, 'Full health diagnostic error', err.message);
  }

  // Test 6: Degraded AI Graceful Semantics
  console.log('\n▶ STEP 6: Verifying Degraded AI Behavior in HealthService...');
  try {
    const healthService = app.get(HealthService);
    const healthResult = await healthService.checkHealth();
    assert(['ready', 'degraded'].includes(healthResult.readiness), `HealthService produces valid readiness status: "${healthResult.readiness}"`);
    assert(healthResult.database.status === 'connected', 'Database reported as connected');
    assert(['available', 'degraded', 'unavailable'].includes(healthResult.ai_service.status), `AI service status is valid enum: "${healthResult.ai_service.status}"`);
  } catch (err: any) {
    assert(false, 'Degraded AI simulation error', err.message);
  }

  // Test 7: Correlation ID Propagation on Health Endpoint
  console.log('\n▶ STEP 7: Verifying Correlation ID Middleware...');
  try {
    const customCorrelationId = `test-corr-${Date.now()}`;
    const res = await fetch(`${baseUrl}/health/live`, {
      headers: { 'X-Correlation-Id': customCorrelationId },
    });
    const echoHeader = res.headers.get('x-correlation-id');
    assert(echoHeader === customCorrelationId, `X-Correlation-Id echoed back: ${echoHeader}`);
  } catch (err: any) {
    assert(false, 'Correlation ID propagation error', err.message);
  }

  if (app) {
    await app.close();
  }

  console.log('\n========================================================================');
  console.log(`📊 Suite 1 Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStartupReliabilityVerification().catch((err) => {
  console.error('Fatal error in verify-startup-reliability:', err);
  process.exit(1);
});
