@echo off
echo ===== INICIANDO QDRANT LOCAL =====

cd /d "%~dp0"
cd qdrant_local

echo Verificando se o Qdrant esta instalado...
if not exist "qdrant.exe" (
    echo ERRO: Qdrant nao encontrado!
    echo Execute primeiro: setup_qdrant_local.bat
    pause
    exit
)

echo.
echo Verificando se Qdrant ja esta rodando...
tasklist /FI "IMAGENAME eq qdrant.exe" 2>NUL | find /I /N "qdrant.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Qdrant ja esta rodando!
    echo Dashboard: http://localhost:6333/dashboard
    start http://localhost:6333/dashboard
    pause
    exit
)

echo.
echo Iniciando Qdrant...
echo API: http://localhost:6333
echo Dashboard: http://localhost:6333/dashboard
echo.
echo Para parar: pressione Ctrl+C ou feche esta janela
echo.

:: Iniciar o Qdrant em background
start "Qdrant Server" cmd /c "qdrant.exe --host 0.0.0.0 --port 6333 --storage-path ./storage"

echo.
echo Aguardando inicializacao (5 segundos)...
timeout /t 5 /nobreak >nul

echo.
echo Testando conexao...
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:6333/health' -TimeoutSec 5 | Out-Null; Write-Host 'Qdrant funcionando!' } catch { Write-Host 'Aguardando inicializacao...' }"

echo.
echo Qdrant iniciado com sucesso!
echo Pressione qualquer tecla para abrir o dashboard...
pause >nul
start http://localhost:6333/dashboard

echo.
echo Para parar o Qdrant, execute: stop_qdrant_local.bat
echo Ou feche a janela do terminal do Qdrant
pause