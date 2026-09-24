@echo off
title Sentinel AI - Launch All Services
echo ========================================================
echo        STARTING SENTINEL AI PLATFORM SERVICES
echo ========================================================
echo.

echo [1/3] Starting Redis Server (Port 6379)...
start "Sentinel - Redis Queue" .\bin\redis\redis-server.exe

timeout /t 2 /nobreak >nul

echo [2/3] Starting Background Scanning Worker (BullMQ)...
start "Sentinel - Background Worker" cmd /k "npx tsx worker.ts"

timeout /t 2 /nobreak >nul

echo [3/3] Starting Next.js Dev Server (Port 3000)...
start "Sentinel - Web App (Next.js)" cmd /k "npm run dev"

echo.
echo ========================================================
echo   ALL SERVICES STARTED!
echo   Open http://localhost:3000 in your browser.
echo.
echo   To generate a public link for judges during the pitch:
echo   npx localtunnel --port 3000
echo ========================================================
pause
