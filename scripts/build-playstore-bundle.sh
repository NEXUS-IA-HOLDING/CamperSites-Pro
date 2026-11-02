#!/usr/bin/env bash
set -e

# ==============================================================================
# build-playstore-bundle.sh — CamperSites Pro
# Generates production Android App Bundle (.aab) for Google Play Console
# Nexus Studio (Nexus AI Holding)
# ==============================================================================

echo "🚀 Iniciando compilación de Android App Bundle (.aab) para Google Play..."
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR/android"

# Limpieza y generación del bundle firmado
./gradlew bundleRelease --no-daemon

BUNDLE_PATH="$PROJECT_DIR/android/app/build/outputs/bundle/release/app-release.aab"

if [ -f "$BUNDLE_PATH" ]; then
    DEST="$PROJECT_DIR/CamperSites-Pro-GooglePlay-v1.0.0.aab"
    cp "$BUNDLE_PATH" "$DEST"
    BUNDLE_SIZE=$(du -h "$DEST" | cut -f1)
    echo "✅ Bundle para Google Play generado con éxito:"
    echo "📦 Ruta: $DEST ($BUNDLE_SIZE)"
    echo ""
    echo "📋 Huellas digitales del certificado de subida (Upload Keystore):"
    keytool -list -v -keystore app/release.keystore -alias campersites-release-key -storepass camperpro2026 | grep -E "(SHA1|SHA256)"
else
    echo "❌ Error: No se encontró el bundle en $BUNDLE_PATH"
    exit 1
fi
