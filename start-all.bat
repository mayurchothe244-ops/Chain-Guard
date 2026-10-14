@echo off
echo ===================================================
echo   ChainGuard - Starting All Services
echo ===================================================

echo [1/3] Starting Local Hardhat Blockchain...
start "ChainGuard Hardhat Blockchain" cmd /k "npx hardhat node"

timeout /t 4 /nobreak >nul

echo [2/3] Starting Backend API Gateway...
start "ChainGuard Backend Gateway" cmd /k "cd backend && npm start"

timeout /t 2 /nobreak >nul

echo [3/3] Starting React + Vite Frontend Dashboard...
start "ChainGuard Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 2 /nobreak >nul

echo.
echo ===================================================
echo   All 3 services launched successfully!
echo   Opening dashboard in your default browser...
echo ===================================================
start http://127.0.0.1:5173/

pause
