@echo off
setlocal enabledelayedexpansion

REM Backend setup and run
pushd "%~dp0backend"
if not exist venv (
  python -m venv venv
)
call venv\Scripts\activate
pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt
start "Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && uvicorn backend:app --reload --host 127.0.0.1 --port 8000"
popd

REM Frontend setup and run
pushd "%~dp0frontend"
if not exist node_modules (
  npm install
) else (
  echo Frontend dependencies already installed.
)
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
popd

endlocal
