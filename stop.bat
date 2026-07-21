@echo off
chcp 65001 >nul
title Stop Trading Workspace
cd /d "%~dp0"

echo Closing Trading Workspace on port 8765...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$pids = @();" ^
  "netstat -ano | Select-String ':8765\s+.*LISTENING' | ForEach-Object {" ^
  "  $parts = ($_ -split '\s+') | Where-Object { $_ -ne '' };" ^
  "  if ($parts.Length -ge 5) { $pids += [int]$parts[-1] }" ^
  "};" ^
  "if (Test-Path '.server.pid') {" ^
  "  $t = Get-Content '.server.pid' -ErrorAction SilentlyContinue;" ^
  "  if ($t -match '^\d+$') { $pids += [int]$t }" ^
  "};" ^
  "$pids = $pids | Sort-Object -Unique;" ^
  "foreach ($p in $pids) {" ^
  "  if ($p -gt 0) {" ^
  "    Stop-Process -Id $p -Force -ErrorAction SilentlyContinue;" ^
  "    Write-Host ('  killed PID ' + $p)" ^
  "  }" ^
  "};" ^
  "Remove-Item '.server.pid' -Force -ErrorAction SilentlyContinue;" ^
  "if (-not $pids) { Write-Host '  nothing was running.' }"

echo Done.
timeout /t 2 >nul
