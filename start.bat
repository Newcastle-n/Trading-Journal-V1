@echo off
chcp 65001 >nul
title Trading Workspace
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 (
  echo.
  echo  Python not found. Install Python and try again.
  echo.
  pause
  exit /b 1
)

echo.
echo  Opening Trading Workspace...
echo  Close this window to stop the site.
echo.

python -u server.py

echo.
echo  Stopped.
timeout /t 2 >nul
