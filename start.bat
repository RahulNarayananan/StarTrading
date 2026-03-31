@echo off
title StarTrading Launcher
echo ============================================
echo   StarTrading Launcher
echo ============================================
echo.

:: Kill any previously running instances
echo [1/3] Stopping any previous instances...
taskkill /F /IM python.exe /T >nul 2>&1
taskkill /F /IM py.exe /T >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
timeout /t 1 >nul

:: Start the backend in a new window
echo [2/3] Starting Python backend (port 8000)...
start "StarTrading Backend" cmd /k "cd /d %~dp0ebay_scraper && uvicorn server:app --port 8000"
timeout /t 4 >nul

:: Start the frontend in a new window
echo [3/3] Starting React frontend (port 3000)...
start "StarTrading Frontend" cmd /k "cd /d %~dp0startrading && npm run dev"
timeout /t 4 >nul

echo.
echo ============================================
echo   All services started!
echo   Frontend: http://localhost:3000/vault
echo   Backend:  http://localhost:8000
echo ============================================
echo.
echo You can close this window. Both services are running in their own windows.
pause
