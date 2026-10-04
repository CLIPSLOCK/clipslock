@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
    py -3 collect-specifications.py --limit 200
    goto finish
)
where python >nul 2>nul
if not errorlevel 1 (
    python collect-specifications.py --limit 200
    goto finish
)
echo Install Python 3.10 or newer from https://www.python.org/downloads/
echo During setup enable "Add python.exe to PATH", then run this file again.
:finish
echo.
pause
