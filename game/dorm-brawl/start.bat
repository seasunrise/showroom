@echo off
chcp 65001 >nul
echo ==========================================
echo   宿舍大乱斗 — 正在启动服务器...
echo ==========================================
echo.
pip install -r requirements.txt 2>nul
python server.py
pause
