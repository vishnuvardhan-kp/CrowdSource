@echo off
REM ========================================================================
REM SamadhanSetu — Unified Development Orchestrator Launcher
REM ========================================================================
title SamadhanSetu Platform Services
node "%~dp0system-doctor.js"
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [ERROR] System Doctor detected critical issues. Please resolve them first.
  pause
  exit /b %ERRORLEVEL%
)

echo.
echo Starting all SamadhanSetu services in dependency order...
node "%~dp0dev-all.js"
