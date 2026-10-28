@echo off
setlocal
cd /d "%~dp0"
if not exist "backend\.env" (
 echo ERROR: configura backend\.env antes de iniciar.
 echo Lee README.md / guia de instalacion.
 pause
 exit /b 1
)
if not exist "backend\node_modules" (
 echo ERROR: faltan las librerias del backend. Ejecuta npm install en backend.
 pause
 exit /b 1
)
if not exist "frontend\node_modules" (
 echo ERROR: faltan las librerias del frontend. Ejecuta npm install en frontend.
 pause
 exit /b 1
)
start "AyniSalud API" /D "%~dp0backend" cmd /k npm run dev
start "AyniSalud Web" /D "%~dp0frontend" cmd /k npm run dev
echo Se iniciaron dos consolas. Cuando terminen de cargar abre http://127.0.0.1:5173
pause
