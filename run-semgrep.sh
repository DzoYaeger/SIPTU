#!/usr/bin/env bash
echo "========================================================"
echo "       SIPTU ULTRA - SEMGREP SECURITY SCANNER"
echo "========================================================"
echo ""

if ! command -v semgrep &> /dev/null; then
    echo "[!] Semgrep CLI belum terpasang. Menginstall via pip..."
    pip install semgrep || {
        echo "[X] Gagal menginstall Semgrep. Silakan install manual via 'pip install semgrep'"
        exit 1
    }
fi

echo "[*] Menjalankan pemindaian keamanan kode..."
semgrep scan --config=.semgrep.yml --config=p/default --config=p/security-audit --output=semgrep-report.txt

echo ""
echo "========================================================"
echo "[OK] Pemindaian selesai! Laporan disimpan di: semgrep-report.txt"
echo "========================================================"
