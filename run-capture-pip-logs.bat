@echo off
REM Convenience wrapper: run from any cwd; it cd's into the right folder.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\capture-pip-logs.ps1"
