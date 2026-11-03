#!/usr/bin/env python3
"""
generate-viral-video-2.py — CamperSites Pro
Generates vertical TikTok video 2: "EL VIENTO Y EL TOLDO SEGURO"
"""

import os
import sys
import math
import subprocess
import shutil
from PIL import Image, ImageDraw, ImageFont

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(PROJECT_DIR, 'docs', 'assets')
FRAMES_DIR = '/tmp/tiktok_frames_video2'
OUTPUT_VIDEO = os.path.join(ASSETS_DIR, 'tiktok_video_2_toldo_viento.mp4')
VOICE_AUDIO = '/tmp/tiktok_voice_2.aiff'
VOICE_WAV = '/tmp/tiktok_voice_2.wav'

os.makedirs(FRAMES_DIR, exist_ok=True)

# 1. GENERATE SPANISH VOICEOVER
print("🎙️ Generando locución en español...")
script_text = (
    "¿A cuántos os ha pasado de estar comiendo tan tranquilos en la camper "
    "y que una racha de viento casi os arranque el toldo exterior? "
    "La nueva app CamperSites Pro incluye sensores meteorológicos en cabina "
    "que te avisan en tiempo real si el toldo está seguro o si hay peligro. "
    "Descárgala gratis en el enlace del perfil."
)
subprocess.run(['say', '-v', 'Mónica', script_text, '-o', VOICE_AUDIO], check=True)
subprocess.run(['ffmpeg', '-y', '-i', VOICE_AUDIO, '-ar', '44100', '-ac', '2', VOICE_WAV], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

cmd = f"ffprobe -i {VOICE_WAV} -show_entries format=duration -v quiet -of csv='p=0'"
duration_str = subprocess.check_output(cmd, shell=True).decode().strip()
total_duration = max(11.0, float(duration_str) + 0.5)
total_frames = int(total_duration * 30)
print(f"⏱️ Duración total: {total_duration:.1f}s ({total_frames} fotogramas)")

logo_img = Image.open(os.path.join(ASSETS_DIR, 'google-play-icon-512.png')).convert('RGBA')
logo_img_small = logo_img.resize((80, 80), Image.Resampling.LANCZOS)
logo_img_large = logo_img.resize((320, 320), Image.Resampling.LANCZOS)

map_img = Image.open(os.path.join(ASSETS_DIR, 'satellite_map_real.jpg')).convert('RGBA')

FONT_PATH = '/System/Library/Fonts/Supplemental/Arial Black.ttf'
FONT_REGULAR = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'

font_hook = ImageFont.truetype(FONT_PATH, 56)
font_title = ImageFont.truetype(FONT_PATH, 44)
font_huge_num = ImageFont.truetype(FONT_PATH, 110)
font_label = ImageFont.truetype(FONT_REGULAR, 28)
font_sub = ImageFont.truetype(FONT_REGULAR, 34)
font_btn = ImageFont.truetype(FONT_PATH, 42)

print("🎨 Renderizando fotogramas animados de toldo y viento...")

for i in range(total_frames):
    t = i / 30.0

    frame = Image.new('RGB', (1080, 1920), color=(15, 23, 42))
    draw = ImageDraw.Draw(frame)

    # Top Brand Header
    draw.rectangle([0, 0, 1080, 120], fill=(7, 13, 24))
    frame.paste(logo_img_small, (40, 20), logo_img_small)
    draw.text((140, 36), "CamperSites Pro", font=font_title, fill=(255, 255, 255))
    draw.rounded_rectangle([760, 32, 1030, 88], radius=16, fill=(245, 158, 11, 40), outline=(245, 158, 11), width=2)
    draw.text((780, 44), "MICRO-CLIMA", font=font_label, fill=(245, 158, 11))

    # SCENE 1: HOOK (0s - 4.0s) -> "¡CUIDADO CON EL TOLDO!"
    if t < 4.0:
        pulse = abs(math.sin(t * 5))
        badge_bg = (239, 68, 68) if pulse > 0.4 else (220, 38, 38)

        draw.rounded_rectangle([160, 180, 920, 260], radius=20, fill=badge_bg)
        draw.text((540, 220), "⚠️ PELIGRO EN CAMPINGS Y PLAYAS", font=font_label, fill=(255, 255, 255), anchor="mm")

        draw.text((540, 360), "¿DEJASTE EL TOLDO", font=font_hook, fill=(255, 255, 255), anchor="mm")
        draw.text((540, 435), "ABIERTO MIENTRAS", font=font_hook, fill=(245, 158, 11), anchor="mm")
        draw.text((540, 510), "COMÍAS O DORMÍAS? 😱", font=font_hook, fill=(239, 68, 68), anchor="mm")

        # Visual illustration card
        draw.rounded_rectangle([110, 610, 970, 1220], radius=32, fill=(19, 29, 49), outline=(239, 68, 68), width=3)
        draw.text((540, 680), "EL ERROR MÁS CARO EN CARAVANING", font=font_sub, fill=(203, 213, 225), anchor="mm")

        # Big Alert Banner
        draw.rounded_rectangle([150, 750, 930, 930], radius=24, fill=(15, 23, 42))
        draw.text((540, 800), "UNA SOLA RACHA DE VIENTO REPENTINA", font=font_label, fill=(148, 163, 184), anchor="mm")
        draw.text((540, 865), "PUEDE DOBLAR LOS BRAZOS (+1.200 €)", font=font_title, fill=(239, 68, 68), anchor="mm")

        # Map Preview
        frame.paste(map_img.resize((820, 240)), (130, 960))

    # SCENE 2: LIVE WIND SENSOR (4.0s - 9.0s)
    elif t < 9.0:
        sub_t = t - 4.0
        # Wind speeds up from 14 to 48 km/h
        wind = int(14 + sub_t * 7.0)
        is_safe = wind < 30
        status_color = (16, 185, 129) if is_safe else (239, 68, 68)
        status_text = "🛡️ TOLDO SEGURO" if is_safe else "🚨 PELIGRO: RECOGER TOLDO"

        draw.rounded_rectangle([200, 160, 880, 230], radius=20, fill=status_color)
        draw.text((540, 195), "SENSORES DE CABINA EN TIEMPO REAL", font=font_label, fill=(255, 255, 255), anchor="mm")

        draw.text((540, 280), "PREVISIÓN DE VIENTO EN EL SPOT", font=font_title, fill=(255, 255, 255), anchor="mm")

        # Big Cockpit Wind Card
        draw.rounded_rectangle([90, 340, 990, 1420], radius=36, fill=(15, 23, 42), outline=status_color, width=4)

        # Wind Gauge
        draw.rounded_rectangle([140, 380, 940, 600], radius=24, fill=(19, 29, 49), outline=status_color, width=2)
        draw.text((540, 460), f"{wind}", font=font_huge_num, fill=status_color, anchor="mm")
        draw.text((540, 545), "KM/H DE RACHA MÁXIMA DETECTADA", font=font_label, fill=(148, 163, 184), anchor="mm")

        # Status Pill
        draw.rounded_rectangle([140, 630, 940, 750], radius=20, fill=status_color)
        draw.text((540, 690), status_text, font=font_title, fill=(255, 255, 255), anchor="mm")

        # Spot Card
        draw.rounded_rectangle([140, 780, 940, 1020], radius=20, fill=(19, 29, 49), outline=(51, 65, 85), width=2)
        draw.text((180, 830), "📍 Spot: Cala del Cabo de Gata", font=font_sub, fill=(255, 255, 255))
        draw.text((180, 890), "🏕️ Pernocta Libre Permitida", font=font_sub, fill=(56, 189, 248))
        draw.text((180, 950), "💨 Orientación del Viento: Levante (Lateral)", font=font_label, fill=(203, 213, 225))

        # Bottom Audio alert note
        draw.rounded_rectangle([140, 1060, 940, 1370], radius=20, fill=(19, 29, 49))
        draw.text((540, 1140), "🔊 ALERTA POR VOZ EN CABINA", font=font_title, fill=(245, 158, 11), anchor="mm")
        draw.text((540, 1220), '"Atención: Rachas de viento peligrosas"', font=font_sub, fill=(255, 255, 255), anchor="mm")
        draw.text((540, 1290), '"Recoja el toldo para evitar desperfectos"', font=font_label, fill=(148, 163, 184), anchor="mm")

    # SCENE 3: CTA (9.0s to end)
    else:
        bounce = int(abs(math.sin((t - 9.0) * 5)) * 18)
        frame.paste(logo_img_large, (540 - 160, 260 - bounce), logo_img_large)

        draw.text((540, 640), "CamperSites Pro", font=font_hook, fill=(255, 255, 255), anchor="mm")
        draw.text((540, 715), "Tu Copiloto Inteligente", font=font_title, fill=(56, 189, 248), anchor="mm")

        draw.rounded_rectangle([110, 780, 970, 1230], radius=28, fill=(19, 29, 49), outline=(51, 65, 85), width=2)
        features = [
            "💨  Sensor de Viento y Alerta de Toldo Seguro",
            "🗺️  +517.000 Spots en España y Europa",
            "🚨  Avisador Oficial de Radares DGT",
            "⚡  Cartografía 100% Offline (Sin Cobertura)",
            "🆓  Descarga Directa Gratuita en APK"
        ]
        y_pos = 830
        for feat in features:
            draw.text((150, y_pos), feat, font=font_sub, fill=(241, 245, 249))
            y_pos += 76

        draw.rounded_rectangle([90, 1300, 990, 1440], radius=24, fill=(16, 185, 129), outline=(255, 255, 255), width=3)
        draw.text((540, 1370), "DESCARGA GRATIS EN MI BIO 📲", font=font_btn, fill=(255, 255, 255), anchor="mm")

        draw.text((540, 1490), "Instalación en 1 minuto en cualquier Android", font=font_label, fill=(148, 163, 184), anchor="mm")
        draw.text((540, 1560), "@campersites_oficial_es", font=font_title, fill=(254, 44, 85), anchor="mm")

    # Bottom ticker
    draw.rectangle([0, 1820, 1080, 1920], fill=(7, 13, 24))
    draw.text((540, 1870), "nexus-ia-holding.github.io/CamperSites-Pro", font=font_sub, fill=(56, 189, 248), anchor="mm")

    frame.save(os.path.join(FRAMES_DIR, f"frame_{i:04d}.png"))
    if i % 60 == 0:
        print(f"  Frame {i}/{total_frames} ({int(i/total_frames*100)}%)...")

print("🎬 Ensamblando vídeo 2 con FFmpeg...")
ffmpeg_cmd = [
    'ffmpeg', '-y',
    '-framerate', '30',
    '-i', os.path.join(FRAMES_DIR, 'frame_%04d.png'),
    '-i', VOICE_WAV,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    OUTPUT_VIDEO
]
subprocess.run(ffmpeg_cmd, check=True)
shutil.rmtree(FRAMES_DIR, ignore_errors=True)

print(f"✅ ¡VÍDEO 2 GENERADO CON ÉXITO!")
print(f"📁 Ruta: {OUTPUT_VIDEO} ({os.path.getsize(OUTPUT_VIDEO)/(1024*1024):.2f} MB)")
