@echo off
setlocal

set "SCRIPT=%~f0"
set "CLI_DIR=%~dp0"
for %%I in ("%CLI_DIR%..") do set "RESOURCES_DIR=%%~fI"
for %%I in ("%RESOURCES_DIR%..") do set "APP_DIR=%%~fI"

set "ELECTRON=%APP_DIR%\fluxnotes.exe"
set "CLI_JS=%CLI_DIR%flux-cli.mjs"

if not exist "%ELECTRON%" set "ELECTRON=%APP_DIR%\Fluxnotes.exe"

if not exist "%ELECTRON%" (
  for %%I in ("%CLI_DIR%..\..") do set "ROOT_DIR=%%~fI"
  set "ELECTRON=%ROOT_DIR%\node_modules\electron\dist\electron.exe"
  set "CLI_JS=%ROOT_DIR%\.vite\cli\flux-cli.mjs"
)

if not exist "%ELECTRON%" (
  echo Electron binary not found. 1>&2
  echo In production: reinstall Fluxnotes or install the Flux CLI from the app. 1>&2
  echo In development: run 'vp install' first. 1>&2
  exit /b 1
)

if not exist "%CLI_JS%" (
  echo CLI script not found at %CLI_JS%. 1>&2
  echo Run 'vp run package' or 'vp run dev' to build it. 1>&2
  exit /b 1
)

set "ELECTRON_RUN_AS_NODE=1"
"%ELECTRON%" "%CLI_JS%" %*
