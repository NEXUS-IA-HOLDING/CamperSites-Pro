#!/usr/bin/env bash
set -e

# ==============================================================================
# generate-tiktok-video.sh — CamperSites Pro
# Generates 3 vertical 1080x1920 (9:16) MP4 video clips for TikTok
# Nexus Studio (Nexus AI Holding)
# ==============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="$PROJECT_DIR/docs/assets"

echo "🎬 Generando paquete de 3 vídeos verticales para TikTok..."

# 1. Vídeo 1: Sensor de Viento y Toldo Seguro
echo "📹 Generando Vídeo 1 (Toldo & Microclima)..."
ffmpeg -y \
  -f lavfi -i "color=c=0x070D18:s=1080x1920:d=10:r=30" \
  -i "$OUTPUT_DIR/satellite_map_real.jpg" \
  -i "$OUTPUT_DIR/google-play-icon-512.png" \
  -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=44100" \
  -filter_complex "
    [1:v]scale=920:920,format=rgba[map];
    [2:v]scale=320:320,format=rgba[logo];
    [0:v][map]overlay=(W-w)/2:520[step1];
    [step1][logo]overlay=(W-w)/2:120[outv]
  " \
  -map "[outv]" -map 3:a -c:v libx264 -pix_fmt yuv420p -c:a aac -t 10 "$OUTPUT_DIR/tiktok_video_1_toldo_viento.mp4"

# 2. Vídeo 2: Radares de Tramo DGT & Cabina
echo "📹 Generando Vídeo 2 (Radares DGT & Tacómetro)..."
ffmpeg -y \
  -f lavfi -i "color=c=0x0F172A:s=1080x1920:d=10:r=30" \
  -i "$OUTPUT_DIR/roads_overlay_real.png" \
  -i "$OUTPUT_DIR/google-play-icon-512.png" \
  -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=44100" \
  -filter_complex "
    [1:v]scale=960:960,format=rgba[roads];
    [2:v]scale=340:340,format=rgba[logo];
    [0:v][roads]overlay=(W-w)/2:500[step1];
    [step1][logo]overlay=(W-w)/2:100[outv]
  " \
  -map "[outv]" -map 3:a -c:v libx264 -pix_fmt yuv420p -c:a aac -t 10 "$OUTPUT_DIR/tiktok_video_2_radares_dgt.mp4"

# 3. Vídeo 3: Calas Secretas & Bóveda 100% Offline
echo "📹 Generando Vídeo 3 (Calas Secretas & +517k Spots)..."
ffmpeg -y \
  -f lavfi -i "color=c=0x061E2E:s=1080x1920:d=10:r=30" \
  -i "$OUTPUT_DIR/satellite_map_real.jpg" \
  -i "$OUTPUT_DIR/google-play-icon-512.png" \
  -f lavfi -i "anullsrc=channel_layout=stereo:sample_rate=44100" \
  -filter_complex "
    [1:v]scale=920:920,format=rgba[map];
    [2:v]scale=340:340,format=rgba[logo];
    [0:v][map]overlay=(W-w)/2:520[step1];
    [step1][logo]overlay=(W-w)/2:110[outv]
  " \
  -map "[outv]" -map 3:a -c:v libx264 -pix_fmt yuv420p -c:a aac -t 10 "$OUTPUT_DIR/tiktok_video_3_calas_offline.mp4"

echo "✅ ¡Los 3 vídeos verticales de TikTok han sido generados con éxito!"
ls -lh "$OUTPUT_DIR"/tiktok_video_*.mp4
