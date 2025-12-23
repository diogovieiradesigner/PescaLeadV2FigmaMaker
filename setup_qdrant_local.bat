@echo off
echo ===== CONFIGURANDO QDRANT LOCAL =====

echo Verificando se o Qdrant ja esta instalado...
where qdrant >nul 2>nul
if %errorlevel% == 0 (
    echo Qdrant ja esta instalado!
    echo Verificando se esta rodando...
    tasklist /FI "IMAGENAME eq qdrant*" 2>NUL | find /I /N "qdrant">NUL
    if "%ERRORLEVEL%"=="0" (
        echo Qdrant ja esta rodando!
        echo Acesse: http://localhost:6333/dashboard
        pause
        exit
    )
)

echo.
echo Baixando e instalando o Qdrant...

:: Criar diretório para o Qdrant
if not exist "qdrant_local" mkdir qdrant_local
cd qdrant_local

:: Baixar a última versão do Qdrant para Windows
echo Baixando Qdrant...
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/qdrant/qdrant/releases/latest/download/qdrant-x86_64-pc-windows-msvc.zip' -OutFile 'qdrant.zip'"

:: Extrair o arquivo
echo Extraindo arquivos...
powershell -Command "Expand-Archive -Path 'qdrant.zip' -DestinationPath '.' -Force"

:: Mover o executável para o diretório atual
move qdrant-x86_64-pc-windows-msvc\qdrant.exe .\qdrant.exe

:: Limpar arquivos desnecessários
rmdir /s /q qdrant-x86_64-pc-windows-msvc
del qdrant.zip

echo.
echo Iniciando o Qdrant...
echo O Qdrant estará disponível em: http://localhost:6333
echo Dashboard: http://localhost:6333/dashboard
echo.

:: Iniciar o Qdrant em background
start "Qdrant" cmd /c "qdrant.exe --host 0.0.0.0 --port 6333 --storage-path ./storage"

echo.
echo Qdrant iniciado com sucesso!
echo Pressione qualquer tecla para abrir o dashboard...
pause >nul
start http://localhost:6333/dashboard

echo.
echo Para parar o Qdrant, feche a janela do terminal ou use Ctrl+C
echo Pressione qualquer tecla para sair...
pause >nul