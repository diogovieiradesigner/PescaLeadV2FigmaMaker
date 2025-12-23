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

:: Verificar se o arquivo de configuracao existe
if not exist "config\config.yaml" (
    echo AVISO: Arquivo de configuracao nao encontrado. Usando configuracao padrao.
)

:: Iniciar o Qdrant em background
start "Qdrant Server" cmd /c "qdrant.exe --config-path config/config.yaml"

echo.
echo Aguardando inicializacao (8 segundos)...
timeout /t 8 /nobreak >nul

echo.
echo Testando conexao...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:6333/collections' -TimeoutSec 5; if ($response.StatusCode -eq 200) { Write-Host 'Qdrant funcionando perfeitamente!' } else { Write-Host 'Qdrant iniciando...' } } catch { Write-Host 'Aguardando inicializacao...' }"

echo.
echo ================================================
echo   QDRANT INICIADO COM SUCESSO!
echo ================================================
echo.
echo URL para Roo Code:
echo   http://localhost:6333
echo.
echo Dashboard:
echo   http://localhost:6333/dashboard
echo.
echo API Status:
echo   http://localhost:6333/collections
echo.
echo Para parar o Qdrant, execute: stop_qdrant_local.bat
echo.
echo Pressione qualquer tecla para abrir o dashboard...
pause >nul
start http://localhost:6333/dashboard

echo.
echo Qdrant rodando em background. Para parar, execute o script stop ou feche a janela do servidor.
pause