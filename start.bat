@echo off
echo Starting Promo Platform...

echo Starting API...
cd /d C:\Users\igor6\promo\apps\api
start "Promo API" cmd /k "npx ts-node --transpile-only -r tsconfig-paths/register src/main.ts"

timeout /t 2 /nobreak >nul

echo Starting Web...
cd /d C:\Users\igor6\promo\apps\web
start "Promo Web" cmd /k "npx next dev"

echo.
echo Platform starting...
echo   Web:  http://localhost:3000
echo   API:  http://localhost:3001/api
echo.
pause
