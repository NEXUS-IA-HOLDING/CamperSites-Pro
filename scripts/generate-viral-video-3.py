#!/usr/bin/env python3
"""
generate-viral-video-3.py — CamperSites Pro
Generates vertical TikTok video 3: "CALAS SECRETAS Y RUTAS ALTERNATIVAS"
"""

import os
import sys
import math
import subprocess
import shutil
from PIL import Image, ImageDraw, ImageFont

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(PROJECT_DIR, 'docs', 'assets')
FRAMES_DIR = '/tmp/tiktok_frames_video3'
OUTPUT_VIDEO = os.path.join(ASSETS_DIR, 'tiktok_video_3_calas_offline.mp4')
VOICE_AUDIO = '/tmp/tiktok_voice_3.aiff'
VOICE_WAV = '/tmp/tiktok_voice_3.wav'

os.makedirs(FRAMES_DIR, exist_ok=True)

# 1. GENERATE SPANISH VOICEOVER
print("🎙️ Generando locución en español...")
script_text = (
    "¿Sabías que en CamperSites Pro puedes mantener pulsado en cualquier playa o rincón del mapa "
    "para descubrir calas secretas de pernocta? "
    "La app te compara dos rutas alternativas para tu camper, "
    "te avisa de las rachas de viento y te lo guarda todo sin cobertura. "
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

font_hook = ImageFont.truetype(FONT_PATH, 54)
font_title = ImageFont.truetype(FONT_PATH, 44)
font_huge_num = ImageFont.truetype(FONT_PATH, 90)
font_label = ImageFont.truetype(FONT_REGULAR, 28)
font_sub = ImageFont.truetype(FONT_REGULAR, 34)
font_btn = ImageFont.truetype(FONT_PATH, 42)

print("🎨 Renderizando fotogramas animados de calas secretas y rutas...")

for i in range(total_frames):
    t = i / 30.0

    frame = Image.new('RGB', (1080, 1920), color=(7, 26, 43))
    draw = ImageDraw.Draw(frame)

    # Top Brand Header
    draw.rectangle([0, 0, 1080, 120], fill=(7, 13, 24))
    frame.paste(logo_img_small, (40, 20), logo_img_small)
    draw.text((140, 36), "CamperSites Pro", font=font_title, fill=(255, 255, 255))
    draw.rounded_rectangle([760, 32, 1030, 88], radius=16, fill=(56, 189, 248, 40), outline=(56, 189, 248), width=2)
    draw.text((790, 44), "EXPLORADOR", font=font_label, fill=(56, 189, 248))

    # SCENE 1: HOOK (0s - 4.0s) -> "EL BOTÓN SECRETO PARA CALAS"
    if t < 4.0:
        pulse = abs(math.sin(t * 4))
        badge_bg = (2, 132, 199) if pulse > 0.4 else (3, 105, 161)

        draw.rounded_rectangle([180, 180, 900, 260], radius=20, fill=badge_bg)
        draw.text((540, 220), "🏖️ TRUCO CAMPER QUE POCOS SABEN", font=font_label, fill=(255, 255, 255), anchor="mm")

        draw.text((540, 360), "¿CÓMO ENCONTRAR", font=font_hook, fill=(255, 255, 255), anchor="mm")
        draw.text((540, 435), "CALAS SECRETAS Y", font=font_hook, fill=(56, 189, 248), anchor="mm")
        draw.text((540, 510), "PERNOCTAR LIBRE? 🚐", font=font_hook, fill=(52, 211, 153), anchor="mm")

        # Visual Card
        draw.rounded_rectangle([110, 610, 970, 1220], radius=32, fill=(15, 23, 42), outline=(56, 189, 248), width=3)
        draw.text((540, 680), "PULSACIÓN PROLONGADA EN CUALQUIER LUGAR", font=font_sub, fill=(203, 213, 225), anchor="mm")

        # Map Preview with animated finger touch
        frame.paste(map_img.resize((820, 360)), (130, 750))
        
        # Touch ripple animation
        ripple_radius = int(30 + pulse * 40)
        draw.ellipse([540 - ripple_radius, 930 - ripple_radius, 540 + ripple_radius, 930 + ripple_radius], outline=(245, 158, 11), width=4)
        draw.ellipse([540 - 15, 930 - 15, 540 + 15, 930 + 15], fill=(245, 158, 11))
        draw.text((540, 1150), "👉 Mantén pulsado 1 segundo en el mapa", font=font_sub, fill=(245, 158, 11), anchor="mm")

    # SCENE 2: SPOT DETAILS & ALTERNATIVE ROUTES (4.0s - 9.0s)
    elif t < 9.0:
        sub_t = t - 4.0

        draw.rounded_rectangle([200, 160, 880, 230], radius=20, fill=(16, 185, 129))
        draw.text((540, 195), "📍 PUNTO MARCADO EN CABINA", font=font_label, fill=(255, 255, 255), anchor="mm")

        draw.text((540, 280), "CALA DEL CABO • DESCONEXIÓN TOTAL", font=font_title, fill=(255, 255, 255), anchor="mm")

        # Big Detail Sheet Card
        draw.rounded_rectangle([90, 340, 990, 1420], radius=36, fill=(15, 23, 42), outline=(56, 189, 248), width=4)

        # Route comparison card
        draw.rounded_rectangle([140, 380, 940, 680], radius=24, fill=(19, 29, 49), outline=(56, 189, 248), width=2)
        draw.text((180, 430), "🛣️ COMPARATIVA DE 2 RUTAS (OSRM):", font=font_sub, fill=(56, 189, 248))
        
        # Route 1: Fastest
        draw.rounded_rectangle([170, 480, 910, 560], radius=12, fill=(15, 23, 42), outline=(16, 185, 129), width=2)
        draw.text((200, 520), "⚡ Ruta Rápida: 42 km • 38 min (0 Peajes)", font=font_label, fill=(16, 185, 129))

        # Route 2: Scenic
        draw.rounded_rectangle([170, 580, 910, 660], radius=12, fill=(15, 23, 42), outline=(245, 158, 11), width=2)
        draw.text((200, 620), "🌄 Ruta Paisajística: 49 km • Costa y Miradores", font=font_label, fill=(245, 158, 11))

        # Services & Weather
        draw.rounded_rectangle([140, 710, 940, 940], radius=20, fill=(19, 29, 49))
        draw.text((180, 760), "🏕️ Pernocta Permitida • Nivelado", font=font_sub, fill=(255, 255, 255))
        draw.text((180, 820), "💨 Viento: 11 km/h • Toldo 100% Seguro", font=font_sub, fill=(52, 211, 153))
        draw.text((180, 880), "📡 Guardado en Bóveda Offline (Sin Datos)", font=font_label, fill=(148, 163, 184))

        # TikTok Share Integration in app
        draw.rounded_rectangle([140, 970, 940, 1070], radius=16, fill=(254, 44, 85, 40), outline=(254, 44, 85), width=2)
        draw.text((540, 1020), "🎵 Compartir Cala en TikTok con 1 Toque", font=font_sub, fill=(254, 44, 85), anchor="mm")

        # Map showing the route
        frame.paste(map_img.resize((800, 280)), (140, 1100))

    # SCENE 3: CTA (9.0s to end)
    else:
        bounce = int(abs(math.sin((t - 9.0) * 5)) * 18)
        frame.paste(logo_img_large, (540 - 160, 260 - bounce), logo_img_large)

        draw.text((540, 640), "CamperSites Pro", font=font_hook, fill=(255, 255, 255), anchor="mm")
        draw.text((540, 715), "Descubre Lugares Mágicos", font=font_title, fill=(56, 189, 248), anchor="mm")

        draw.rounded_rectangle([110, 780, 970, 1230], radius=28, fill=(19, 29, 49), outline=(51, 65, 85), width=2)
        features = [
            "📍  Marcado Libre de Calas y Puntos Secretos",
            "🛣️  Cálculo de Varias Rutas Alternativas",
            "🗺️  +517.000 Spots en Toda Europa",
            "🚨  Avisador Oficial de Radares DGT",
            "⚡  100% Offline (Sin Cobertura)"
        ]
        y_pos = 830
        for feat in features:
            draw.text((150, y_pos), feat, font=font_sub, fill=(241, 245, 249))
            y_pos += 76

        draw.rounded_rectangle([90, 1300, 990, 1440], radius=24, fill=(16, 185, 129), outline=(255, 255, 255), width=3)
        draw.text((540, 1370), "DESCARGA GRATIS EN MI BIO 📲", font=font_btn, fill=(255, 255, 255), anchor="mm")

        draw.text((540, 1490), "APK Directo sin coste para Android", font=font_label, fill=(148, 163, 184), anchor="mm")
        draw.text((540, 1560), "@campersites_oficial_es", font=font_title, fill=(254, 44, 85), anchor="mm")

    # Bottom ticker
    draw.rectangle([0, 1820, 1080, 1920], fill=(7, 13, 24))
    draw.text((540, 1870), "nexus-ia-holding.github.io/CamperSites-Pro", font=font_sub, fill=(56, 189, 248), anchor="mm")

    frame.save(os.path.join(FRAMES_DIR, f"frame_{i:04d}.png"))
    if i % 60 == 0:
        print(f"  Frame {i}/{total_frames} ({int(i/total_frames*100)}%)...")

print("🎬 Ensamblando vídeo 3 con FFmpeg...")
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

print(f"✅ ¡VÍDEO 3 GENERADO CON ÉXITO!")
print(f"📁 Ruta: {OUTPUT_VIDEO} ({os.path.getsize(OUTPUT_VIDEO)/(1024*1024):.2f} MB)")
