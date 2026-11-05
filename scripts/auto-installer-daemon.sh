#!/bin/bash
APK="/Users/mrhardcore/Desktop/campersites-pro/CamperSites-Pro/android/app/build/outputs/apk/release/app-release.apk"
echo "=== CamperSites Pro v2.0.0 Auto-Installer Daemon Started ==="
echo "Target APK: $APK"

COUNT=0
while true; do
  DEVICE=$(adb devices | grep -E "device$" | head -n 1 | awk '{print $1}')
  UNAUTHORIZED=$(adb devices | grep -E "unauthorized$" | head -n 1 | awk '{print $1}')
  
  if [ -n "$UNAUTHORIZED" ]; then
    echo "[$(date +'%H:%M:%S')] Device $UNAUTHORIZED is connected — waiting for user to tap 'Permitir depuración USB' on phone screen."
  fi

  if [ -n "$DEVICE" ]; then
    echo "[$(date +'%H:%M:%S')] ✅ Dispositivo autorizado detectado: $DEVICE"
    echo "Instalando CamperSites Pro v2.0.0..."
    INSTALL_OUT=$(adb -s "$DEVICE" install -r "$APK" 2>&1)
    echo "$INSTALL_OUT"
    
    if echo "$INSTALL_OUT" | grep -iq "Success"; then
      echo "[$(date +'%H:%M:%S')] 🚀 ¡INSTALACIÓN v2.0.0 COMPLETADA CON ÉXITO!"
      adb -s "$DEVICE" shell am start -n com.campersitespro/com.campersitestemp.MainActivity 2>/dev/null || adb -s "$DEVICE" shell monkey -p com.campersitespro -c android.intent.category.LAUNCHER 1
      echo "[$(date +'%H:%M:%S')] ✅ Aplicación iniciada en pantalla de $DEVICE"
      exit 0
    fi
  fi
  
  sleep 2
  COUNT=$((COUNT + 1))
  if [ $((COUNT % 15)) -eq 0 ]; then
    adb reconnect 2>/dev/null || true
  fi
done
