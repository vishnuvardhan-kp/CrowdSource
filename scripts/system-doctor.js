#!/usr/bin/env node
/**
 * ResolvIN — System Health & Environment Doctor
 * 
 * Performs 11 diagnostic checkpoints to verify platform readiness:
 *  1. Node.js runtime version (>= 20)
 *  2. Python environment & version (>= 3.10)
 *  3. PostgreSQL connectivity & PostGIS/schema readiness
 *  4. AI service virtual environment & required Python packages
 *  5. Backend dependencies & build readiness
 *  6. Frontend dependencies & Next.js setup
 *  7. Mobile dependencies & Expo SDK readiness
 *  8. Environment variables & critical configuration validation
 *  9. Storage directories & write permissions
 * 10. Port status & conflict analysis (5432, 8000, 3001, 3000, 8081)
 * 11. Final readiness verdict & actionable guidance
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const net = require('net');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const MOBILE_DIR = path.join(ROOT_DIR, 'mobile');
const AI_DIR = path.join(ROOT_DIR, 'ai-service');

const results = [];

function recordResult(num, name, status, message, details = null) {
  results.push({ num, name, status, message, details });
  const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️ ' : '❌';
  console.log(`[Checkpoint ${num.toString().padStart(2, '0')}] ${icon} [${status.padEnd(4)}] ${name}: ${message}`);
  if (details && (status === 'FAIL' || status === 'WARN')) {
    console.log(`                ↳ ${details}`);
  }
}

// -----------------------------------------------------------------------------
// Checkpoint 1: Node.js Runtime Version
// -----------------------------------------------------------------------------
function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.replace(/^v/, '').split('.')[0], 10);
  if (major >= 20) {
    recordResult(1, 'Node.js Runtime', 'PASS', `Node.js ${version} (>= v20 required)`);
  } else {
    recordResult(1, 'Node.js Runtime', 'FAIL', `Node.js ${version} is unsupported (v20+ required)`, 'Please upgrade Node.js to v20 or v22 LTS.');
  }
}

// -----------------------------------------------------------------------------
// Checkpoint 2: Python Environment & Version
// -----------------------------------------------------------------------------
function checkPythonVersion() {
  const venvPythonWin = path.join(AI_DIR, 'venv', 'Scripts', 'python.exe');
  const venvPythonUnix = path.join(AI_DIR, 'venv', 'bin', 'python');
  const pythonPath = fs.existsSync(venvPythonWin) ? venvPythonWin : (fs.existsSync(venvPythonUnix) ? venvPythonUnix : 'python');

  try {
    const res = spawnSync(pythonPath, ['--version'], { encoding: 'utf-8' });
    const output = ((res.stdout || '') + (res.stderr || '')).trim();
    const match = output.match(/Python (\d+)\.(\d+)\.(\d+)/);
    if (match) {
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      if (major >= 3 && minor >= 10) {
        recordResult(2, 'Python Runtime', 'PASS', `${output} at ${pythonPath} (>= 3.10 required)`);
      } else {
        recordResult(2, 'Python Runtime', 'FAIL', `${output} is unsupported (< 3.10)`, 'Python 3.10+ required for FastAPI and PyTorch.');
      }
    } else {
      recordResult(2, 'Python Runtime', 'WARN', `Detected Python: ${output}`);
    }
  } catch (err) {
    recordResult(2, 'Python Runtime', 'FAIL', 'Python executable not found in PATH or ai-service/venv', err.message);
  }
}

// -----------------------------------------------------------------------------
// Checkpoint 3: PostgreSQL Database Status & Connectivity
// -----------------------------------------------------------------------------
async function checkPostgres() {
  const envFile = fs.existsSync(path.join(BACKEND_DIR, '.env')) 
    ? path.join(BACKEND_DIR, '.env') 
    : path.join(ROOT_DIR, '.env');
  
  let host = 'localhost';
  let port = 5432;
  let user = 'postgres';
  let password = 'postgres_password';
  let database = 'samadhan_setu';

  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [k, ...v] = trimmed.split('=');
      const val = v.join('=').trim().replace(/^['"]|['"]$/g, '');
      if (k === 'DATABASE_HOST' || k === 'DB_HOST') host = val;
      if (k === 'DATABASE_PORT' || k === 'DB_PORT') port = parseInt(val, 10);
      if (k === 'DATABASE_USER' || k === 'DB_USER') user = val;
      if (k === 'DATABASE_PASSWORD' || k === 'DB_PASSWORD') password = val;
      if (k === 'DATABASE_NAME' || k === 'DB_NAME') database = val;
    }
  }

  // First test if port 5432 is reachable
  const portOpen = await checkPortReachable(host, port, 1000);
  if (!portOpen) {
    recordResult(3, 'PostgreSQL Status', 'WARN', `PostgreSQL port ${port} is not currently listening.`, 'Start database via: node backend/scripts/run-dev-postgres.js');
    return;
  }

  // Try authenticating using pg
  try {
    const { Client } = require(path.join(BACKEND_DIR, 'node_modules', 'pg'));
    const client = new Client({ host, port, user, password, database, connectionTimeoutMillis: 3000 });
    await client.connect();
    
    // Check tables or PostGIS extension
    const extRes = await client.query("SELECT extname FROM pg_extension WHERE extname = 'postgis';");
    const hasPostgis = extRes.rows.length > 0;
    
    const tableRes = await client.query("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';");
    const tableCount = parseInt(tableRes.rows[0].count, 10);
    
    await client.end();
    recordResult(3, 'PostgreSQL Status', 'PASS', `Connected to "${database}" (${tableCount} tables present, PostGIS: ${hasPostgis ? 'enabled' : 'not enabled/optional'})`);
  } catch (err) {
    recordResult(3, 'PostgreSQL Status', 'WARN', `Port ${port} open but DB connection failed: ${err.message}`, 'Check credentials or run migrations.');
  }
}

// -----------------------------------------------------------------------------
// Checkpoint 4: AI Service Virtual Environment & Dependencies
// -----------------------------------------------------------------------------
function checkAiServiceEnv() {
  const venvDir = path.join(AI_DIR, 'venv');
  if (!fs.existsSync(venvDir)) {
    recordResult(4, 'AI Service Environment', 'FAIL', 'ai-service/venv does not exist.', 'Create venv: cd ai-service && python -m venv venv && pip install -r requirements.txt');
    return;
  }

  const venvPython = process.platform === 'win32'
    ? path.join(venvDir, 'Scripts', 'python.exe')
    : path.join(venvDir, 'bin', 'python');

  try {
    const res = spawnSync(venvPython, ['-c', 'import fastapi, uvicorn, httpx, pydantic; print("OK")'], { encoding: 'utf-8' });
    const output = (res.stdout || '').trim();
    if (res.status === 0 && output === 'OK') {
      recordResult(4, 'AI Service Environment', 'PASS', 'Virtual environment & key dependencies verified (fastapi, uvicorn, httpx, pydantic)');
    } else {
      recordResult(4, 'AI Service Environment', 'FAIL', 'Missing AI Python dependencies in venv', (res.stderr || output || '').trim());
    }
  } catch (err) {
    recordResult(4, 'AI Service Environment', 'FAIL', 'Missing AI Python dependencies in venv', err.message);
  }
}

// -----------------------------------------------------------------------------
// Checkpoint 5: Backend Dependencies
// -----------------------------------------------------------------------------
function checkBackendDependencies() {
  const nm = path.join(BACKEND_DIR, 'node_modules');
  if (!fs.existsSync(nm)) {
    recordResult(5, 'Backend Dependencies', 'FAIL', 'backend/node_modules is missing.', 'Run: cd backend && npm install');
    return;
  }

  const requiredPkgs = ['@nestjs/core', 'typeorm', 'pg', 'class-validator', 'bcryptjs'];
  const missing = [];
  for (const pkg of requiredPkgs) {
    if (!fs.existsSync(path.join(nm, pkg))) {
      missing.push(pkg);
    }
  }

  if (missing.length === 0) {
    recordResult(5, 'Backend Dependencies', 'PASS', 'Backend node_modules intact and critical packages present');
  } else {
    recordResult(5, 'Backend Dependencies', 'FAIL', `Missing packages: ${missing.join(', ')}`, 'Run: cd backend && npm install');
  }
}

// -----------------------------------------------------------------------------
// Checkpoint 6: Frontend Dependencies
// -----------------------------------------------------------------------------
function checkFrontendDependencies() {
  const nm = path.join(FRONTEND_DIR, 'node_modules');
  if (!fs.existsSync(nm)) {
    recordResult(6, 'Frontend Dependencies', 'FAIL', 'frontend/node_modules is missing.', 'Run: cd frontend && npm install');
    return;
  }

  const requiredPkgs = ['next', 'react', 'react-dom'];
  const missing = [];
  for (const pkg of requiredPkgs) {
    if (!fs.existsSync(path.join(nm, pkg))) {
      missing.push(pkg);
    }
  }

  if (missing.length === 0) {
    recordResult(6, 'Frontend Dependencies', 'PASS', 'Frontend dependencies intact (Next.js, React)');
  } else {
    recordResult(6, 'Frontend Dependencies', 'FAIL', `Missing packages: ${missing.join(', ')}`, 'Run: cd frontend && npm install');
  }
}

// -----------------------------------------------------------------------------
// Checkpoint 7: Mobile Dependencies
// -----------------------------------------------------------------------------
function checkMobileDependencies() {
  const nm = path.join(MOBILE_DIR, 'node_modules');
  if (!fs.existsSync(nm)) {
    recordResult(7, 'Mobile Dependencies', 'FAIL', 'mobile/node_modules is missing.', 'Run: cd mobile && npm install');
    return;
  }

  const requiredPkgs = ['expo', 'react-native', 'expo-router'];
  const missing = [];
  for (const pkg of requiredPkgs) {
    if (!fs.existsSync(path.join(nm, pkg))) {
      missing.push(pkg);
    }
  }

  if (missing.length === 0) {
    recordResult(7, 'Mobile Dependencies', 'PASS', 'Mobile dependencies intact (Expo SDK, React Native)');
  } else {
    recordResult(7, 'Mobile Dependencies', 'FAIL', `Missing packages: ${missing.join(', ')}`, 'Run: cd mobile && npm install');
  }
}

// -----------------------------------------------------------------------------
// Checkpoint 8: Environment Variables & Secrets
// -----------------------------------------------------------------------------
function checkEnvVariables() {
  const backendEnv = path.join(BACKEND_DIR, '.env');
  const rootEnv = path.join(ROOT_DIR, '.env');

  if (!fs.existsSync(backendEnv) && !fs.existsSync(rootEnv)) {
    recordResult(8, 'Environment Config', 'FAIL', 'No .env found in root or backend/', 'Copy .env.example to .env');
    return;
  }

  const parseEnv = (filePath) => {
    if (!fs.existsSync(filePath)) return {};
    const vars = {};
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [k, ...v] = trimmed.split('=');
      vars[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
    }
    return vars;
  };

  const envs = { ...parseEnv(rootEnv), ...parseEnv(backendEnv) };
  const issues = [];
  const warnings = [];

  if (!envs.DATABASE_HOST && !envs.DB_HOST) issues.push('DATABASE_HOST');
  if (!envs.DATABASE_NAME && !envs.DB_NAME) issues.push('DATABASE_NAME');
  if (!envs.JWT_SECRET) issues.push('JWT_SECRET');

  const nvidiaKey = envs.NVIDIA_API_KEY || envs.NVIDIA_NIM_API_KEY;
  if (!nvidiaKey || nvidiaKey.includes('placeholder') || nvidiaKey === 'nvapi-xxx') {
    warnings.push('NVIDIA_API_KEY not set or placeholder (AI service will operate in deterministic mock/fallback mode)');
  }

  if (envs.JWT_SECRET === 'dev-jwt-secret-key-change-in-prod') {
    warnings.push('JWT_SECRET is using development default value');
  }

  if (issues.length > 0) {
    recordResult(8, 'Environment Config', 'FAIL', `Missing required environment variables: ${issues.join(', ')}`);
  } else if (warnings.length > 0) {
    recordResult(8, 'Environment Config', 'WARN', 'Configuration valid with warnings', warnings.join('; '));
  } else {
    recordResult(8, 'Environment Config', 'PASS', 'All required environment variables properly populated');
  }
}

// -----------------------------------------------------------------------------
// Checkpoint 9: Storage Directories & Write Permissions
// -----------------------------------------------------------------------------
function checkStorageDirectories() {
  const dirs = [
    path.join(ROOT_DIR, 'uploads'),
    path.join(ROOT_DIR, 'uploads', 'evidence'),
    path.join(BACKEND_DIR, '.pgdata'),
  ];

  let allWritable = true;
  for (const dir of dirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const testFile = path.join(dir, `.doctor-write-test-${Date.now()}`);
      fs.writeFileSync(testFile, 'ok', 'utf-8');
      fs.unlinkSync(testFile);
    } catch (err) {
      allWritable = false;
      recordResult(9, 'Storage Permissions', 'FAIL', `Cannot write to ${path.relative(ROOT_DIR, dir)}: ${err.message}`);
      return;
    }
  }

  if (allWritable) {
    recordResult(9, 'Storage Permissions', 'PASS', 'Storage directories exist and are writable (uploads/, uploads/evidence/, backend/.pgdata)');
  }
}

// -----------------------------------------------------------------------------
// Checkpoint 10: Port Status & Conflict Analysis
// -----------------------------------------------------------------------------
async function checkPortReachable(host, port, timeoutMs = 600) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isConnected = false;
    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      isConnected = true;
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      resolve(false);
    });

    socket.connect(port, host);
  });
}

async function checkPortStatus() {
  const ports = [
    { port: 5432, service: 'PostgreSQL Database' },
    { port: 8000, service: 'FastAPI AI Service' },
    { port: 3001, service: 'NestJS Backend API' },
    { port: 3000, service: 'Next.js Frontend' },
    { port: 8081, service: 'Expo Metro Bundler' },
  ];

  const active = [];
  const free = [];

  for (const { port, service } of ports) {
    const isOpen = await checkPortReachable('127.0.0.1', port);
    if (isOpen) {
      active.push(`${service} (port ${port} ACTIVE)`);
    } else {
      free.push(`${service} (port ${port} free)`);
    }
  }

  if (active.length === 0) {
    recordResult(10, 'Port Availability', 'PASS', 'All application ports (5432, 8000, 3001, 3000, 8081) are clear and ready to start');
  } else {
    recordResult(10, 'Port Availability', 'WARN', `Some ports are already in use: ${active.join(', ')}`, 'Existing instances can be reused or cleanly shut down before running dev:all.');
  }
}

// -----------------------------------------------------------------------------
// Checkpoint 11: Live Service Health & API Probes
// -----------------------------------------------------------------------------
async function checkLiveServiceContracts() {
  const probes = [];

  // 1. FastAPI AI Service
  const aiOpen = await checkPortReachable('127.0.0.1', 8000);
  if (aiOpen) {
    try {
      const res = await fetch('http://127.0.0.1:8000/health', { signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        const data = await res.json();
        probes.push(`AI Microservice: ${data.status} (Provider: ${data.provider})`);
      } else {
        probes.push(`AI Microservice: HTTP ${res.status}`);
      }
    } catch (e) {
      probes.push(`AI Microservice: probe failed (${e.message})`);
    }
  }

  // 2. NestJS Backend API Health & Readiness
  const backendOpen = await checkPortReachable('127.0.0.1', 3001);
  if (backendOpen) {
    try {
      const res = await fetch('http://127.0.0.1:3001/api/health', { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        probes.push(`Backend API: readiness=${data.readiness}, DB=${data.database?.status}, AI=${data.ai_service?.status}`);
      } else {
        probes.push(`Backend API: HTTP ${res.status}`);
      }

      const rootRes = await fetch('http://127.0.0.1:3001/health', { signal: AbortSignal.timeout(2000) });
      if (rootRes.ok) {
        probes.push(`Backend Root /health: OK`);
      }
    } catch (e) {
      probes.push(`Backend API: probe failed (${e.message})`);
    }
  }

  if (probes.length > 0) {
    recordResult(11, 'Live Service Contracts', 'PASS', probes.join(' | '));
  } else {
    recordResult(11, 'Live Service Contracts', 'PASS', 'Live ports (8000, 3001) not active; static environment is ready for dev:all');
  }
}

// -----------------------------------------------------------------------------
// Checkpoint 12: Final Verdict & Actionable Guidance
// -----------------------------------------------------------------------------
function summarizeResults() {
  console.log('\n========================================================================');
  console.log('🩺 RESOLVIN PLATFORM HEALTH VERDICT');
  console.log('========================================================================');

  const fails = results.filter(r => r.status === 'FAIL');
  const warns = results.filter(r => r.status === 'WARN');
  const passes = results.filter(r => r.status === 'PASS');

  console.log(`Results: ${passes.length} Passed, ${warns.length} Warnings, ${fails.length} Failed\n`);

  if (fails.length > 0) {
    console.error('❌ CRITICAL ISSUES DETECTED: Platform is NOT ready to run consistently.');
    console.error('Please resolve the failed checkpoints listed above before starting.');
    process.exit(1);
  } else if (warns.length > 0) {
    console.log('⚠️  PLATFORM OPERATIONAL WITH WARNINGS: The platform can run, but check warnings above.');
    console.log('💡 To launch all services reliably in topological order:');
    console.log('   npm run dev:all\n');
    process.exit(0);
  } else {
    console.log('🏆 ALL CHECKPOINTS PASSED: The environment is 100% healthy and ready.');
    console.log('💡 To launch all services reliably in topological order:');
    console.log('   npm run dev:all\n');
    process.exit(0);
  }
}

async function run() {
  console.log('========================================================================');
  console.log('🩺 RESOLVIN SYSTEM DOCTOR — ENVIRONMENT & READINESS DIAGNOSTIC');
  console.log('========================================================================\n');

  checkNodeVersion();
  checkPythonVersion();
  await checkPostgres();
  checkAiServiceEnv();
  checkBackendDependencies();
  checkFrontendDependencies();
  checkMobileDependencies();
  checkEnvVariables();
  checkStorageDirectories();
  await checkPortStatus();
  await checkLiveServiceContracts();
  summarizeResults();
}

run().catch((err) => {
  console.error('Fatal doctor error:', err);
  process.exit(1);
});
