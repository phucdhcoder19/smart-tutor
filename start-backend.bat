@echo off
rem Starts the SmartTutor backend and exposes it on a fixed public ngrok URL.
rem Set NGROK_DOMAIN to your free static domain (dashboard.ngrok.com > Domains).
set NGROK_DOMAIN=subtentacular-apogamously-tiffany.ngrok-free.dev

cd /d "%~dp0backend"
start "SmartTutor API" cmd /k ".venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
start "SmartTutor tunnel" cmd /k "ngrok http 8000 --url=%NGROK_DOMAIN%"

echo Backend: http://localhost:8000/api/health
echo Public:  https://%NGROK_DOMAIN%/api/health
