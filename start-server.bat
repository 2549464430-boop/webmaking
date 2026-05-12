@echo off
cd /d "%~dp0"
set "NODE_EXE=node"

where node >nul 2>nul
if errorlevel 1 (
  if exist "C:\Users\Administrator\AppData\Local\OpenAI\Codex\bin\node.exe" (
    set "NODE_EXE=C:\Users\Administrator\AppData\Local\OpenAI\Codex\bin\node.exe"
  ) else (
    echo Cannot find Node.js.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
  )
)

echo Starting AeroIntel Daily...
echo.
echo Open this address in your browser:
echo http://127.0.0.1:4173
echo.
echo Keep this black window open while using the website.
echo Press Ctrl + C in this window when you want to stop it.
echo.
"%NODE_EXE%" scripts\serve.mjs
pause
