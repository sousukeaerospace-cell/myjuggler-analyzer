@echo off
chcp 65001 >nul
echo === マイジャグラーV 設定推定アプリ 起動中 ===
cd /d "%~dp0web-app"
start "" "http://localhost:3000"
npm run dev
