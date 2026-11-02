#!/bin/bash
APK="/Users/mrhardcore/Desktop/campersites-pro/CamperSites-Pro/CamperSites-Pro-v1.0.apk"
echo "=== CamperSites Pro Auto-Installer Daemon Started ==="
echo "Target APK: $APK"

COUNT=0
while true; do
  DEVICE=$(adb devices | grep -E "device$" | head -n 1 | awk '{print $1}')
  UNAUTHORIZED=$(adb devices | grep -E "unauthorized$" | head -n 1 | awk '{print $1}')
  
  if [ -n "$UNAUTHORIZED" ]; then
    echo "[$(date +'%H:%M:%S')] Device $UNAUTHORIZED is connected but waiting for user authorization on phone screen."
  fi

  if [ -n "$DEVICE" ]; then
    echo "[$(date +'%H:%M:%S')] ✅ Dispositivo activo detectado: $DEVICE"
    echo "Instalando APK de producción..."
    INSTALL_OUT=$(adb -s "$DEVICE" install -r "$APK" 2>&1)
    echo "$INSTALL_OUT"
    
    if echo "$INSTALL_OUT" | grep -iq "Success"; then
      echo "[$(date +'%H:%M:%S')] 🚀 ¡INSTALACIÓN COMPLETADA CON ÉXITO!"
      adb -s "$DEVICE" shell am start -n com.campersitestemp/.MainActivity
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
