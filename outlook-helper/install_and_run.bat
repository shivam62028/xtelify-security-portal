@echo off
setlocal EnableDelayedExpansion
title Xtelify Outlook Desktop Helper

echo.
echo  ============================================================
echo    Xtelify Outlook Desktop Helper  ^|  Setup and Launch
echo  ============================================================
echo.

:: ── Check Python ────────────────────────────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Python is not installed or not in PATH.
    echo  Please install Python 3.9+ from https://python.org
    echo  Make sure to check "Add Python to PATH" during install.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('python --version 2^>^&1') do set PY_VER=%%v
echo  Found: %PY_VER%
echo.

:: ── Create virtual environment if missing ────────────────────────────────────
if not exist ".venv\" (
    echo  Creating Python virtual environment in .venv\ ...
    python -m venv .venv
    if errorlevel 1 (
        echo  ERROR: Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo  Done.
    echo.
)

:: ── Install / update dependencies ────────────────────────────────────────────
echo  Installing dependencies (flask, requests, pywin32) ...
.venv\Scripts\pip install --quiet --upgrade pip
.venv\Scripts\pip install --quiet -r requirements.txt
if errorlevel 1 (
    echo  ERROR: Failed to install one or more packages.
    echo  Try running this file as Administrator.
    pause
    exit /b 1
)
echo  Dependencies ready.
echo.

:: ── Post-install pywin32 COM registration ────────────────────────────────────
echo  Registering pywin32 COM extensions...
.venv\Scripts\python -c "import win32com; print('  pywin32 OK')" 2>nul
if errorlevel 1 (
    echo  Attempting pywin32 post-install script...
    .venv\Scripts\python .venv\Scripts\pywin32_postinstall.py -install 2>nul
)
echo.

:: ── Launch helper ────────────────────────────────────────────────────────────
echo  ============================================================
echo    Starting Xtelify Outlook Helper on 127.0.0.1:7789
echo  ============================================================
echo.
echo  IMPORTANT: Keep this window open while using the portal.
echo  Press Ctrl+C to stop the helper.
echo.

.venv\Scripts\python outlook_helper.py
pause
