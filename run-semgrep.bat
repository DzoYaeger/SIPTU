@echo off
set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"
set "PATH=%LOCALAPPDATA%\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\Scripts;%APPDATA%\Python\Python313\Scripts;%PATH%"
echo ========================================================
echo        SIPTU ULTRA - SEMGREP SECURITY SCANNER
echo ========================================================
echo.

where semgrep >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Semgrep CLI belum terpasang di sistem.
    echo [*] Menginstall semgrep via pip...
    pip install semgrep
    if %errorlevel% neq 0 (
        echo [X] Gagal menginstall Semgrep via pip.
        echo [*] Anda juga bisa menjalankan via Docker:
        echo     docker run --rm -v "%cd%:/src" returntocorp/semgrep semgrep scan --config=.semgrep.yml
        pause
        exit /b 1
    )
)

echo [*] Menjalankan pemindaian keamanan kode...
semgrep scan --config=.semgrep.yml --config=p/default --config=p/security-audit --output=semgrep-report.txt

echo.
echo ========================================================
echo [OK] Pemindaian selesai! Laporan disimpan ke: semgrep-report.txt
echo ========================================================
pause
