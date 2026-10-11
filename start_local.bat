@echo off
title SecureCloud Offline Runner
cd /d "%~dp0"

echo ========================================================
echo   Starting SecureCloud (100%% OFFLINE - No Internet Needed)
echo ========================================================
echo.

echo [1/2] Starting Python FastAPI Backend on Port 8000...
start "SecureCloud Backend (FastAPI)" cmd /k "backend\venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"

echo Waiting for backend to start...
ping 127.0.0.1 -n 4 >nul

echo [2/2] Starting React Frontend on Port 3000...
start "SecureCloud Frontend (Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo Waiting for frontend to start...
ping 127.0.0.1 -n 4 >nul

echo Opening browser...
start http://localhost:3000
ping 127.0.0.1 -n 2 >nul
start http://127.0.0.1:8000/docs

echo.
echo ========================================================
echo   SecureCloud is LIVE!
echo   Website:      http://localhost:3000
echo   Swagger Docs: http://127.0.0.1:8000/docs
echo ========================================================
echo.
echo Please leave this window open while presenting.
echo.
pause
