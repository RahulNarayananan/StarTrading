@echo off
setlocal
title StarTrading Launcher
echo ============================================
echo   StarTrading Launcher
echo ============================================
echo.

:: Path to the marker file
set "MARKER_FILE=%~dp0.dependencies_installed"

if exist "%MARKER_FILE%" (
    echo [SKIP] Project dependencies already installed.
    goto :START_STOPS
)

echo [1/4] Installing Python requirements...
pip install -r "%~dp0ebay_scraper\requirements.txt"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install Python requirements.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/4] Installing Playwright browsers...
playwright install chromium
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install Playwright browsers.
    pause
    exit /b %ERRORLEVEL%
)

echo [3/4] Installing Node.js requirements...
cd /d "%~dp0startrading"
call npm install --no-fund --no-audit
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install Node.js requirements.
    pause
    exit /b %ERRORLEVEL%
)
cd /d "%~dp0"

:: Create the marker file
echo Dependencies installed on %date% %time% > "%MARKER_FILE%"
echo [DONE] All dependencies installed successfully.
echo.

:START_STOPS

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
