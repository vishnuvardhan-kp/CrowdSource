#!/usr/bin/env node
/**
 * SamadhanSetu — Unified Development Orchestrator (dev:all)
 * 
 * Orchestrates platform startup in strict topological dependency order:
 *  1. Port safety & conflict resolution
 *  2. PostgreSQL Database (port 5432) -> polls until listening & accepting connections
 *  3. FastAPI AI Service (port 8000) -> polls /health until HTTP 200
 *  4. NestJS Backend API (port 3001) -> polls /api/health/live until HTTP 200
 *  5. Next.js Web Frontend (port 3000)
 *  6. Expo Mobile Bundler (port 8081)
 * 
 * Manages all processes with clean Ctrl+C teardown.
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const MOBILE_DIR = path.join(ROOT_DIR, 'mobile');
const AI_DIR = path.join(ROOT_DIR, 'ai-service');

const spawnedProcesses = [];
let isShuttingDown = false;

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------
function log(step, msg) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] [${step}] ${msg}`);
}

async function isPortOpen(host, port, timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {
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

async function pollUrl(url, timeoutMs = 45000, intervalMs = 1000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise((resolve) => {
        const req = http.get(url, { timeout: 1500 }, (res) => {
          resolve(res.statusCode >= 200 && res.statusCode < 400);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
      });
      if (ok) return true;
    } catch (e) {
      // ignore
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

async function pollPort(host, port, timeoutMs = 30000, intervalMs = 800) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const open = await isPortOpen(host, port);
    if (open) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

function killProcessTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGKILL');
    }
  } catch (e) {
    // Process might already be dead
  }
}

async function cleanup() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n🛑 Initiating graceful shutdown of all SamadhanSetu services...');

  for (const { name, proc } of spawnedProcesses.reverse()) {
    if (proc && proc.pid) {
      log('SHUTDOWN', `Terminating ${name} (PID: ${proc.pid})...`);
      killProcessTree(proc.pid);
    }
  }

  log('SHUTDOWN', 'All services terminated cleanly.');
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', () => {
  if (!isShuttingDown) cleanup();
});

// -----------------------------------------------------------------------------
// Step 1: Pre-flight checks
// -----------------------------------------------------------------------------
async function checkPorts() {
  log('PRE-FLIGHT', 'Checking ports for stale listeners...');
  const ports = [5432, 8000, 3001, 3000, 8081];
  for (const port of ports) {
    const active = await isPortOpen('127.0.0.1', port);
    if (active) {
      log('PRE-FLIGHT', `Port ${port} is currently active. Will reuse if compatible or proceed.`);
    }
  }
}

// -----------------------------------------------------------------------------
// Step 2: Start PostgreSQL Database
// -----------------------------------------------------------------------------
async function startPostgres() {
  const isUp = await isPortOpen('127.0.0.1', 5432);
  if (isUp) {
    log('POSTGRES', 'PostgreSQL is already active on port 5432. Reusing existing instance.');
    return;
  }

  log('POSTGRES', 'Starting embedded PostgreSQL database on port 5432...');
  const scriptPath = path.join(BACKEND_DIR, 'scripts', 'run-dev-postgres.js');
  const pgProc = spawn(process.execPath, [scriptPath], {
    cwd: BACKEND_DIR,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  pgProc.stdout.on('data', (d) => process.stdout.write(`[PG] ${d.toString()}`));
  pgProc.stderr.on('data', (d) => process.stderr.write(`[PG-ERR] ${d.toString()}`));
  spawnedProcesses.push({ name: 'PostgreSQL', proc: pgProc });

  const ready = await pollPort('127.0.0.1', 5432, 35000);
  if (!ready) {
    throw new Error('PostgreSQL failed to start within 35 seconds on port 5432.');
  }
  log('POSTGRES', '✅ PostgreSQL is ready and accepting connections on port 5432.');
}

// -----------------------------------------------------------------------------
// Step 3: Start FastAPI AI Service
// -----------------------------------------------------------------------------
async function startAiService() {
  const isUp = await pollUrl('http://127.0.0.1:8000/health', 1500, 500);
  if (isUp) {
    log('AI-SERVICE', 'AI Service is already active on port 8000. Reusing existing instance.');
    return;
  }

  log('AI-SERVICE', 'Starting FastAPI AI Service on port 8000...');
  const venvPythonWin = path.join(AI_DIR, 'venv', 'Scripts', 'python.exe');
  const venvPythonUnix = path.join(AI_DIR, 'venv', 'bin', 'python');
  const pythonPath = fs.existsSync(venvPythonWin) ? venvPythonWin : (fs.existsSync(venvPythonUnix) ? venvPythonUnix : 'python');

  const aiProc = spawn(pythonPath, ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000'], {
    cwd: AI_DIR,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  aiProc.stdout.on('data', (d) => process.stdout.write(`[AI] ${d.toString()}`));
  aiProc.stderr.on('data', (d) => process.stderr.write(`[AI-ERR] ${d.toString()}`));
  spawnedProcesses.push({ name: 'AI Service', proc: aiProc });

  const ready = await pollUrl('http://127.0.0.1:8000/health', 30000, 1000);
  if (!ready) {
    throw new Error('AI Service failed to reach healthy status within 30 seconds on port 8000.');
  }
  log('AI-SERVICE', '✅ FastAPI AI Service is ready and responding at http://127.0.0.1:8000.');
}

// -----------------------------------------------------------------------------
// Step 4: Start NestJS Backend API
// -----------------------------------------------------------------------------
async function startBackend() {
  const isUp = await pollUrl('http://127.0.0.1:3001/api/health/ready', 1500, 500);
  if (isUp) {
    log('BACKEND', 'NestJS Backend is already active on port 3001. Reusing existing instance.');
    return;
  }

  log('BACKEND', 'Starting NestJS Backend API on port 3001...');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const backendProc = spawn(npmCmd, ['run', 'start:dev'], {
    cwd: BACKEND_DIR,
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  backendProc.stdout.on('data', (d) => process.stdout.write(`[BACKEND] ${d.toString()}`));
  backendProc.stderr.on('data', (d) => process.stderr.write(`[BACKEND-ERR] ${d.toString()}`));
  spawnedProcesses.push({ name: 'Backend API', proc: backendProc });

  const ready = await pollUrl('http://127.0.0.1:3001/api/health/ready', 45000, 1500);
  if (!ready) {
    throw new Error('NestJS Backend API failed to reach ready status within 45 seconds on port 3001.');
  }
  log('BACKEND', '✅ NestJS Backend API is ready at http://localhost:3001/api.');
}

// -----------------------------------------------------------------------------
// Step 5: Start Next.js Frontend & Expo Mobile
// -----------------------------------------------------------------------------
function startFrontendAndMobile() {
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  log('FRONTEND', 'Starting Next.js Web Frontend on port 3000...');
  const frontendProc = spawn(npmCmd, ['run', 'dev'], {
    cwd: FRONTEND_DIR,
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
  });
  frontendProc.stdout.on('data', (d) => process.stdout.write(`[FRONTEND] ${d.toString()}`));
  frontendProc.stderr.on('data', (d) => process.stderr.write(`[FRONTEND-ERR] ${d.toString()}`));
  spawnedProcesses.push({ name: 'Web Frontend', proc: frontendProc });

  log('MOBILE', 'Starting Expo Mobile Bundler on port 8081...');
  const mobileProc = spawn(npxCmd, ['expo', 'start'], {
    cwd: MOBILE_DIR,
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
  });
  mobileProc.stdout.on('data', (d) => process.stdout.write(`[MOBILE] ${d.toString()}`));
  mobileProc.stderr.on('data', (d) => process.stderr.write(`[MOBILE-ERR] ${d.toString()}`));
  spawnedProcesses.push({ name: 'Expo Mobile', proc: mobileProc });
}

// -----------------------------------------------------------------------------
// Main Orchestration
// -----------------------------------------------------------------------------
async function main() {
  console.log('========================================================================');
  console.log('🚀 SAMADHANSETU UNIFIED PLATFORM ORCHESTRATOR');
  console.log('========================================================================\n');

  try {
    await checkPorts();
    await startPostgres();
    await startAiService();
    await startBackend();
    startFrontendAndMobile();

    console.log('\n========================================================================');
    console.log('🌟 SAMADHANSETU PLATFORM IS FULLY OPERATIONAL');
    console.log('========================================================================');
    console.log('  🗄️  PostgreSQL Database:  localhost:5432');
    console.log('  🤖 FastAPI AI Service:    http://127.0.0.1:8000');
    console.log('  🌐 NestJS Backend API:    http://localhost:3001/api');
    console.log('  💻 Next.js Web Portal:    http://localhost:3000');
    console.log('  📱 Expo Mobile Bundler:   http://localhost:8081');
    console.log('========================================================================');
    console.log('Press Ctrl+C at any time to gracefully terminate all services.\n');
  } catch (err) {
    console.error(`\n❌ Startup failed: ${err.message}`);
    await cleanup();
    process.exit(1);
  }
}

main();
