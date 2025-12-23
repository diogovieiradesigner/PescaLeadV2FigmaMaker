@echo off
echo ===== PARANDO QDRANT LOCAL =====

echo Verificando processos do Qdrant...
tasklist /FI "IMAGENAME eq qdrant*" 2>NUL | find /I /N "qdrant">NUL
if "%ERRORLEVEL%"=="0" (
    echo Qdrant encontrado! Parando processos...
    taskkill /IM qdrant.exe /F >nul 2>&1
    echo Qdrant parado com sucesso!
) else (
    echo Nenhum processo do Qdrant encontrado.
)

echo.
echo Para reiniciar, execute: setup_qdrant_local.bat
pause