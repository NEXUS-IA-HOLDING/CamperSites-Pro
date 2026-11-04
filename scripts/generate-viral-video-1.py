#!/usr/bin/env python3
"""
generate-viral-video-1.py — CamperSites Pro
Generates a complete, high-impact vertical TikTok video (1080x1920, 30fps)
with animated Cockpit HUD, speedometers, DGT radar alerts, subtitles,
and real Spanish voiceover!
"""

import os
import sys
import math
import subprocess
import shutil
from PIL import Image, ImageDraw, ImageFont

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(PROJECT_DIR, 'docs', 'assets')
FRAMES_DIR = '/tmp/tiktok_frames_video1'
OUTPUT_VIDEO = os.path.join(ASSETS_DIR, 'tiktok_video_1_radares_dgt.mp4')
DESKTOP_COPY = '/Users/mrhardcore/Desktop/CamperSites_Pro_Demo_TikTok.mp4'
VOICE_AUDIO = '/tmp/tiktok_voice_1.aiff'
VOICE_WAV = '/tmp/tiktok_voice_1.wav'

os.makedirs(FRAMES_DIR, exist_ok=True)

# 1. GENERATE SPANISH VOICEOVER
print("🎙️ Generando locución en español...")
script_text = (
    "¿Sabías que frenar justo antes de salir de un radar de tramo ya no sirve? "
    "La nueva app CamperSites Pro calcula tu velocidad media real dentro del túnel en todo momento "
    "para evitar multas en tu furgoneta o autocaravana. "
    "Descárgala gratis en el enlace del perfil."
)
subprocess.run(['say', '-v', 'Mónica', script_text, '-o', VOICE_AUDIO], check=True)
subprocess.run(['ffmpeg', '-y', '-i', VOICE_AUDIO, '-ar', '44100', '-ac', '2', VOICE_WAV], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# Get audio duration
cmd = f"ffprobe -i {VOICE_WAV} -show_entries format=duration -v quiet -of csv='p=0'"
duration_str = subprocess.check_output(cmd, shell=True).decode().strip()
total_duration = max(11.0, float(duration_str) + 0.5)
total_frames = int(total_duration * 30)
print(f"⏱️ Duración total: {total_duration:.1f}s ({total_frames} fotogramas a 30 fps)")

# Load assets
logo_img = Image.open(os.path.join(ASSETS_DIR, 'google-play-icon-512.png')).convert('RGBA')
logo_img_small = logo_img.resize((70, 70), Image.Resampling.LANCZOS)
logo_img_large = logo_img.resize((300, 300), Image.Resampling.LANCZOS)

map_img = Image.open(os.path.join(ASSETS_DIR, 'satellite_map_real.jpg')).convert('RGBA')

# Fonts
FONT_PATH = '/System/Library/Fonts/Supplemental/Arial Black.ttf'
FONT_REGULAR = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'

font_huge = ImageFont.truetype(FONT_PATH, 72)
font_huge_num = ImageFont.truetype(FONT_PATH, 110)
font_hook = ImageFont.truetype(FONT_PATH, 46)
font_title = ImageFont.truetype(FONT_PATH, 34)
font_sub = ImageFont.truetype(FONT_REGULAR, 26)
font_label = ImageFont.truetype(FONT_REGULAR, 22)
font_micro = ImageFont.truetype(FONT_REGULAR, 18)
font_btn = ImageFont.truetype(FONT_PATH, 40)

print("🎨 Renderizando fotogramas animados...")

for i in range(total_frames):
    t = i / 30.0  # current time in seconds

    # Canvas (1080 x 1920)
    frame = Image.new('RGB', (1080, 1920), color=(10, 15, 26))
    draw = ImageDraw.Draw(frame)

    # Ambient background glow
    glow_color = (239, 68, 68) if t < 3.8 else (56, 189, 248)
    draw.ellipse([540 - 450, 420 - 450, 540 + 450, 420 + 450], fill=(glow_color[0]//10, glow_color[1]//10, glow_color[2]//10))

    # Top Brand Header (Clean persistent bar)
    draw.rectangle([0, 0, 1080, 110], fill=(6, 11, 20))
    frame.paste(logo_img_small, (40, 20), logo_img_small)
    draw.text((125, 36), "CamperSites Pro", font=font_title, fill=(255, 255, 255))
    draw.rounded_rectangle([790, 30, 1040, 80], radius=14, fill=(56, 189, 248, 40), outline=(56, 189, 248), width=2)
    draw.text((915, 55), "MODO CABINA", font=font_sub, fill=(56, 189, 248), anchor="mm")

    # =========================================================================
    # SCENE 1: HOOK (0s - 3.8s) -> UNIFIED, CLEAN & PROFESSIONAL
    # =========================================================================
    if t < 3.8:
        pulse = abs(math.sin(t * 5))
        badge_border = (239, 68, 68) if pulse > 0.5 else (185, 28, 28)

        # 1. Unified Hook Card (All headline text unified here in one block)
        draw.rounded_rectangle([60, 135, 1020, 365], radius=24, fill=(15, 23, 42), outline=badge_border, width=3)
        draw.rounded_rectangle([270, 155, 810, 202], radius=12, fill=(220, 38, 38))
        draw.text((540, 178), "🚨 ALERTA DGT • RADAR DE TRAMO", font=font_sub, fill=(255, 255, 255), anchor="mm")

        draw.text((540, 245), "¿FRENAR JUSTO AL SALIR?", font=font_hook, fill=(255, 255, 255), anchor="mm")
        draw.text((540, 302), "¡YA NO TE SALVA DE LA MULTA!", font=font_title, fill=(245, 158, 11), anchor="mm")
        draw.text((540, 340), "Miden tu velocidad media en TODO el túnel, no al final", font=font_label, fill=(148, 163, 184), anchor="mm")

        # 2. Cockpit Simulation Device (y=390 to y=1440)
        draw.rounded_rectangle([60, 390, 1020, 1440], radius=28, fill=(15, 23, 42), outline=(56, 189, 248), width=3)

        # Device Top Bar
        draw.rounded_rectangle([80, 410, 1000, 475], radius=16, fill=(10, 15, 26))
        draw.text((110, 442), "📍 AP-6 KM 42.0 • TÚNEL DE GUADARRAMA", font=font_sub, fill=(226, 232, 240), anchor="lm")
        draw.rounded_rectangle([840, 425, 980, 462], radius=8, fill=(239, 68, 68, 60), outline=(239, 68, 68), width=1)
        draw.text((910, 443), "4.8 KM", font=font_label, fill=(239, 68, 68), anchor="mm")

        # Satellite Viewport
        map_crop = map_img.resize((920, 480))
        dim = Image.new('RGBA', (920, 480), (10, 15, 26, 110))
        map_crop.paste(dim, (0, 0), dim)
        frame.paste(map_crop, (80, 495))

        # Highway Asphalt
        draw.rectangle([80, 710, 1000, 830], fill=(30, 41, 59))
        draw.line([(80, 710), (1000, 710)], fill=(71, 85, 105), width=3)
        draw.line([(80, 830), (1000, 830)], fill=(71, 85, 105), width=3)
        for x in range(100, 980, 70):
            draw.line([(x, 770), (x + 35, 770)], fill=(255, 255, 255), width=4)

        # Entry Gantry
        draw.rectangle([130, 600, 150, 840], fill=(148, 163, 184))
        draw.rectangle([115, 600, 275, 640], fill=(220, 38, 38))
        draw.text((195, 620), "📷 ENTRADA", font=font_label, fill=(255, 255, 255), anchor="mm")
        draw.polygon([(135, 640), (80, 830), (280, 830)], fill=(239, 68, 68, 40))

        # Exit Gantry
        draw.rectangle([910, 600, 930, 840], fill=(148, 163, 184))
        draw.rectangle([785, 600, 945, 640], fill=(220, 38, 38))
        draw.text((865, 620), "📷 SALIDA", font=font_label, fill=(255, 255, 255), anchor="mm")

        # Scanning beam
        scan_x = 150 + int((t / 3.8) * 760)
        draw.line([(150, 770), (scan_x, 770)], fill=(245, 158, 11), width=6)

        # Vehicle (Detailed Camper Van)
        van_x = scan_x
        van_y = 770
        draw.rounded_rectangle([van_x - 55, van_y - 25, van_x + 55, van_y + 25], radius=8, fill=(248, 250, 252), outline=(56, 189, 248), width=2)
        draw.rounded_rectangle([van_x + 15, van_y - 20, van_x + 48, van_y + 20], radius=4, fill=(30, 58, 138))
        draw.rounded_rectangle([van_x - 45, van_y - 24, van_x + 10, van_y + 24], radius=4, fill=(203, 213, 225))
        draw.polygon([(van_x + 55, van_y - 15), (van_x + 150, van_y - 35), (van_x + 150, van_y + 35), (van_x + 55, van_y + 15)], fill=(254, 240, 138, 70))
        draw.rectangle([van_x - 55, van_y - 18, van_x - 52, van_y - 8], fill=(239, 68, 68))
        draw.rectangle([van_x - 55, van_y + 8, van_x - 52, van_y + 18], fill=(239, 68, 68))

        draw.rounded_rectangle([van_x - 45, van_y - 65, van_x + 45, van_y - 35], radius=8, fill=(15, 23, 42), outline=(56, 189, 248), width=2)
        draw.text((van_x, van_y - 50), "88 km/h", font=font_label, fill=(56, 189, 248), anchor="mm")

        # Telemetry Gauges Below Map
        draw.rounded_rectangle([80, 1000, 420, 1160], radius=20, fill=(10, 15, 26), outline=(56, 189, 248), width=2)
        draw.text((250, 1060), "88", font=font_huge, fill=(56, 189, 248), anchor="mm")
        draw.text((250, 1125), "KM/H GPS ACTUAL", font=font_label, fill=(148, 163, 184), anchor="mm")

        draw.rounded_rectangle([440, 1000, 680, 1160], radius=20, fill=(10, 15, 26), outline=(220, 38, 38), width=2)
        draw.ellipse([560 - 50, 1070 - 50, 560 + 50, 1070 + 50], fill=(255, 255, 255), outline=(220, 38, 38), width=8)
        draw.text((560, 1070), "90", font=font_title, fill=(0, 0, 0), anchor="mm")
        draw.text((560, 1135), "LÍMITE DGT", font=font_micro, fill=(148, 163, 184), anchor="mm")

        draw.rounded_rectangle([700, 1000, 1000, 1160], radius=20, fill=(10, 15, 26), outline=(16, 185, 129), width=2)
        draw.text((850, 1055), "87.4", font=font_huge, fill=(16, 185, 129), anchor="mm")
        draw.text((850, 1125), "MEDIA EN TRAMO", font=font_label, fill=(16, 185, 129), anchor="mm")

        # Solution Banner inside cockpit
        draw.rounded_rectangle([80, 1180, 1000, 1310], radius=18, fill=(19, 29, 49), outline=(16, 185, 129), width=2)
        draw.text((540, 1222), "🛡️ CÁLCULO DE VELOCIDAD MEDIA EN TIEMPO REAL", font=font_sub, fill=(16, 185, 129), anchor="mm")
        draw.text((540, 1270), "La app te indica la velocidad exacta para no ser multado", font=font_label, fill=(241, 245, 249), anchor="mm")

        draw.rounded_rectangle([80, 1335, 1000, 1415], radius=14, fill=(56, 189, 248, 30), outline=(56, 189, 248), width=2)
        draw.text((540, 1375), "MIRA CÓMO FUNCIONA EL MODO CABINA 👇", font=font_title, fill=(56, 189, 248), anchor="mm")

    # =========================================================================
    # SCENE 2: COCKPIT HUD IN ACTION (3.8s - 8.5s)
    # =========================================================================
    elif t < 8.5:
        sub_t = t - 3.8
        speed = 84 + int(sub_t * 1.5)
        avg_speed = 86.4 + (sub_t * 0.2)
        progress = min(1.0, sub_t / 4.7)

        # Header tag
        draw.rounded_rectangle([180, 150, 900, 220], radius=18, fill=(16, 185, 129))
        draw.text((540, 185), "✅ ASISTENTE INTELIGENTE EN VIVO", font=font_sub, fill=(255, 255, 255), anchor="mm")

        draw.text((540, 270), "CÁLCULO DE VELOCIDAD MEDIA", font=font_title, fill=(255, 255, 255), anchor="mm")

        # Dashboard Container
        draw.rounded_rectangle([70, 330, 1010, 1420], radius=32, fill=(15, 23, 42), outline=(56, 189, 248), width=4)

        # Speedometer HUD
        draw.rounded_rectangle([120, 370, 520, 560], radius=20, fill=(19, 29, 49), outline=(56, 189, 248), width=2)
        draw.text((320, 450), f"{speed}", font=font_huge_num, fill=(56, 189, 248), anchor="mm")
        draw.text((320, 525), "KM/H GPS ACTUAL", font=font_label, fill=(148, 163, 184), anchor="mm")

        # Road limit badge
        draw.rounded_rectangle([560, 370, 960, 560], radius=20, fill=(19, 29, 49), outline=(245, 158, 11), width=2)
        draw.text((760, 450), "90", font=font_huge_num, fill=(245, 158, 11), anchor="mm")
        draw.text((760, 525), "LÍMITE VÍA DGT", font=font_label, fill=(148, 163, 184), anchor="mm")

        # Average Speed Banner
        avg_bg = (16, 185, 129) if avg_speed <= 90 else (239, 68, 68)
        draw.rounded_rectangle([120, 590, 960, 720], radius=20, fill=(19, 29, 49), outline=avg_bg, width=3)
        draw.text((540, 630), "VELOCIDAD MEDIA DENTRO DEL TRAMO", font=font_label, fill=(203, 213, 225), anchor="mm")
        draw.text((540, 680), f"{avg_speed:.1f} KM/H  •  LEGAL", font=font_title, fill=avg_bg, anchor="mm")

        # Progress Bar
        draw.text((130, 755), "Progreso en el tramo:", font=font_label, fill=(148, 163, 184))
        draw.rounded_rectangle([120, 790, 960, 815], radius=10, fill=(51, 65, 85))
        draw.rounded_rectangle([120, 790, 120 + int(840 * progress), 815], radius=10, fill=(56, 189, 248))

        # Satellite Map with route
        frame.paste(map_img.resize((840, 360)), (120, 840))
        car_x = 180 + int(640 * progress)
        draw.ellipse([car_x - 18, 1020 - 18, car_x + 18, 1020 + 18], fill=(56, 189, 248), outline=(255, 255, 255), width=4)

        # Wind sensor badge
        draw.rounded_rectangle([120, 1230, 960, 1370], radius=18, fill=(16, 185, 129, 40), outline=(16, 185, 129), width=2)
        draw.text((540, 1275), "💨 RACHAS LATERALES: 12 KM/H", font=font_sub, fill=(255, 255, 255), anchor="mm")
        draw.text((540, 1330), "🛡️ TOLDO Y VEHÍCULO SEGUROS", font=font_title, fill=(52, 211, 153), anchor="mm")

    # =========================================================================
    # SCENE 3: CALL TO ACTION (8.5s to end)
    # =========================================================================
    else:
        bounce = int(abs(math.sin((t - 8.5) * 5)) * 18)
        frame.paste(logo_img_large, (540 - 150, 250 - bounce), logo_img_large)

        draw.text((540, 620), "CamperSites Pro", font=font_hook, fill=(255, 255, 255), anchor="mm")
        draw.text((540, 690), "La App de Cabina para Campers", font=font_title, fill=(56, 189, 248), anchor="mm")

        # Feature bullet points card
        draw.rounded_rectangle([90, 750, 990, 1210], radius=28, fill=(19, 29, 49), outline=(51, 65, 85), width=2)
        features = [
            "🗺️  +517.000 Spots y Campings en Europa",
            "🚨  Radares DGT Oficiales Fijos y de Tramo",
            "💨  Sensor de Viento y Alerta de Toldo",
            "⚡  Navegación 100% Offline (Sin Cobertura)",
            "🆓  Totalmente Gratis y Sin Suscripciones"
        ]
        y_pos = 800
        for feat in features:
            draw.text((140, y_pos), feat, font=font_sub, fill=(241, 245, 249))
            y_pos += 76

        # CTA Download Button
        draw.rounded_rectangle([80, 1280, 1000, 1420], radius=24, fill=(16, 185, 129), outline=(255, 255, 255), width=3)
        draw.text((540, 1350), "DESCARGA GRATIS EN MI BIO 📲", font=font_btn, fill=(255, 255, 255), anchor="mm")

        draw.text((540, 1470), "Compatible con cualquier móvil o tablet Android", font=font_label, fill=(148, 163, 184), anchor="mm")
        draw.text((540, 1540), "@campersites_oficial_es", font=font_title, fill=(254, 44, 85), anchor="mm")

    # Bottom safe ticker on all frames
    draw.rectangle([0, 1820, 1080, 1920], fill=(6, 11, 20))
    draw.text((540, 1870), "nexus-ia-holding.github.io/CamperSites-Pro", font=font_sub, fill=(56, 189, 248), anchor="mm")

    # Save frame
    frame.save(os.path.join(FRAMES_DIR, f"frame_{i:04d}.png"))
    if i % 60 == 0:
        print(f"  Frame {i}/{total_frames} ({int(i/total_frames*100)}%)...")

print("🎬 Ensamblando vídeo final con FFmpeg y mezclando audio...")
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

# Copy directly to Desktop for instant access
try:
    shutil.copy(OUTPUT_VIDEO, DESKTOP_COPY)
    print(f"📋 Copia actualizada directamente en el Escritorio: {DESKTOP_COPY}")
except Exception as e:
    print(f"⚠️ No se pudo copiar al Escritorio: {e}")

# Clean up frames
shutil.rmtree(FRAMES_DIR, ignore_errors=True)

print(f"✅ ¡VÍDEO VIRAL GENERADO CON ÉXITO!")
print(f"📁 Ruta: {OUTPUT_VIDEO}")
file_size = os.path.getsize(OUTPUT_VIDEO) / (1024 * 1024)
print(f"📦 Tamaño: {file_size:.2f} MB")
