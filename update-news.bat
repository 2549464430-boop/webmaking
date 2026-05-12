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

echo Updating real news from feeds.json...
echo.
"%NODE_EXE%" scripts\update_news.mjs
echo.
echo Done. Refresh http://127.0.0.1:4173 to see the latest data.
pause
