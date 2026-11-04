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
logo_img_small = logo_img.resize((180, 180), Image.Resampling.LANCZOS)
logo_img_large = logo_img.resize((320, 320), Image.Resampling.LANCZOS)

map_img = Image.open(os.path.join(ASSETS_DIR, 'satellite_map_real.jpg')).convert('RGBA')
map_img = map_img.resize((860, 520), Image.Resampling.LANCZOS)

# Fonts
FONT_PATH = '/System/Library/Fonts/Supplemental/Arial Black.ttf'
FONT_REGULAR = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'

font_hook = ImageFont.truetype(FONT_PATH, 58)
font_title = ImageFont.truetype(FONT_PATH, 44)
font_huge_num = ImageFont.truetype(FONT_PATH, 110)
font_label = ImageFont.truetype(FONT_REGULAR, 28)
font_sub = ImageFont.truetype(FONT_REGULAR, 34)
font_btn = ImageFont.truetype(FONT_PATH, 42)

print("🎨 Renderizando fotogramas animados...")

for i in range(total_frames):
    t = i / 30.0  # current time in seconds

    # Canvas (1080 x 1920)
    frame = Image.new('RGB', (1080, 1920), color=(11, 17, 32))
    draw = ImageDraw.Draw(frame)

    # Ambient background gradient circles
    glow_color = (239, 68, 68, 30) if t < 4.0 else (56, 189, 248, 25)
    draw.ellipse([540 - 500, 400 - 500, 540 + 500, 400 + 500], fill=glow_color[:3])

    # Top Brand Header (Visible in all frames)
    draw.rectangle([0, 0, 1080, 120], fill=(7, 13, 24))
    frame.paste(logo_img_small.resize((80, 80)), (40, 20), logo_img_small.resize((80, 80)))
    draw.text((140, 36), "CamperSites Pro", font=font_title, fill=(255, 255, 255))
    draw.rounded_rectangle([780, 32, 1030, 88], radius=16, fill=(56, 189, 248, 40), outline=(56, 189, 248), width=2)
    draw.text((800, 44), "MODO CABINA", font=font_label, fill=(56, 189, 248))

    # SCENE 1: HOOK (0s - 3.8s) -> "¡CUIDADO CON LOS RADARES DE TRAMO!"
    if t < 3.8:
        pulse = abs(math.sin(t * 4))
        badge_bg = (239, 68, 68) if pulse > 0.5 else (185, 28, 28)
        
        # Red warning pill
        draw.rounded_rectangle([160, 150, 920, 225], radius=20, fill=badge_bg)
        draw.text((540, 188), "🚨 ALERTA DGT • RADAR DE TRAMO", font=font_label, fill=(255, 255, 255), anchor="mm")

        # Hook text (con espacio amplio y sin pisarse)
        draw.text((540, 285), "¿SABÍAS QUE FRENAR", font=font_hook, fill=(255, 255, 255), anchor="mm")
        draw.text((540, 355), "ANTES DE SALIR", font=font_hook, fill=(245, 158, 11), anchor="mm")
        draw.text((540, 425), "¡YA NO TE SALVA DE LA MULTA!", font=font_sub, fill=(239, 68, 68), anchor="mm")

        # Central illustration: Radar trap visual card
        draw.rounded_rectangle([90, 480, 990, 1280], radius=32, fill=(19, 29, 49), outline=(239, 68, 68), width=3)
        draw.text((540, 525), "📷 CONTROL DGT EN TÚNEL A-6 • KM 42.5", font=font_sub, fill=(148, 163, 184), anchor="mm")
        
        # Car / Speed indicator
        draw.rounded_rectangle([130, 575, 950, 715], radius=20, fill=(15, 23, 42), outline=(239, 68, 68), width=2)
        draw.text((540, 615), "LA DGT MIDE TU VELOCIDAD MEDIA REAL", font=font_label, fill=(226, 232, 240), anchor="mm")
        draw.text((540, 670), "DURANTE TODO EL TÚNEL (NO AL FINAL)", font=font_title, fill=(239, 68, 68), anchor="mm")

        # Map preview card con radar visible
        map_crop = map_img.resize((820, 380))
        frame.paste(map_crop, (130, 745))

        # Dibujar carretera e iconos de radar sobre el mapa
        draw.line([(150, 940), (930, 940)], fill=(71, 85, 105), width=28)
        draw.line([(150, 940), (930, 940)], fill=(255, 255, 255), width=4)

        # Entrada Radar
        draw.rounded_rectangle([160, 810, 300, 895], radius=14, fill=(239, 68, 68), outline=(255, 255, 255), width=2)
        draw.text((230, 835), "ENTRADA", font=font_label, fill=(255, 255, 255), anchor="mm")
        draw.text((230, 870), "📷 RADAR", font=font_label, fill=(255, 255, 255), anchor="mm")

        # Salida Radar
        draw.rounded_rectangle([780, 810, 920, 895], radius=14, fill=(239, 68, 68), outline=(255, 255, 255), width=2)
        draw.text((850, 835), "SALIDA", font=font_label, fill=(255, 255, 255), anchor="mm")
        draw.text((850, 870), "📷 RADAR", font=font_label, fill=(255, 255, 255), anchor="mm")

        # Señal DGT 90 km/h en el centro
        draw.ellipse([540 - 45, 845 - 45, 540 + 45, 845 + 45], fill=(255, 255, 255), outline=(220, 38, 38), width=6)
        draw.text((540, 845), "90", font=font_title, fill=(0, 0, 0), anchor="mm")

        # Vehículo en movimiento dentro del tramo
        car_pos_x = 320 + int((t / 3.8) * 440)
        draw.rounded_rectangle([car_pos_x - 38, 915, car_pos_x + 38, 965], radius=10, fill=(56, 189, 248), outline=(255, 255, 255), width=3)
        draw.text((car_pos_x, 940), "🚐", font=font_title, anchor="mm")

        # Velocidad en tiempo real debajo del coche
        draw.text((car_pos_x, 995), "88 km/h", font=font_label, fill=(56, 189, 248), anchor="mm")

        # Zona de medición activa (haz de radar)
        draw.text((540, 1160), "⚡ ZONA DE MEDICIÓN CONTINUA ACTIVA", font=font_label, fill=(245, 158, 11), anchor="mm")

        # Bottom tip
        draw.text((540, 1225), "Mira cómo lo soluciona esta app 👇", font=font_sub, fill=(56, 189, 248), anchor="mm")

    # SCENE 2: COCKPIT HUD IN ACTION (3.8s - 8.5s)
    elif t < 8.5:
        sub_t = t - 3.8
        speed = 84 + int(sub_t * 1.5)  # Speeds up from 84 to 90 km/h
        avg_speed = 86.4 + (sub_t * 0.2)
        progress = min(1.0, sub_t / 4.7)

        # Header tag
        draw.rounded_rectangle([200, 160, 880, 230], radius=20, fill=(16, 185, 129))
        draw.text((540, 195), "✅ ASISTENTE INTELIGENTE EN VIVO", font=font_label, fill=(255, 255, 255), anchor="mm")

        draw.text((540, 280), "CÁLCULO DE VELOCIDAD MEDIA", font=font_title, fill=(255, 255, 255), anchor="mm")

        # The Phone / Cockpit Dashboard Container
        draw.rounded_rectangle([90, 340, 990, 1420], radius=36, fill=(15, 23, 42), outline=(56, 189, 248), width=4)

        # 1. Speedometer HUD
        draw.rounded_rectangle([140, 380, 520, 560], radius=20, fill=(19, 29, 49), outline=(56, 189, 248), width=2)
        draw.text((330, 450), f"{speed}", font=font_huge_num, fill=(56, 189, 248), anchor="mm")
        draw.text((330, 525), "KM/H GPS ACTUAL", font=font_label, fill=(148, 163, 184), anchor="mm")

        # 2. Road limit badge
        draw.rounded_rectangle([560, 380, 940, 560], radius=20, fill=(19, 29, 49), outline=(245, 158, 11), width=2)
        draw.text((750, 450), "90", font=font_huge_num, fill=(245, 158, 11), anchor="mm")
        draw.text((750, 525), "LÍMITE VÍA DGT", font=font_label, fill=(148, 163, 184), anchor="mm")

        # 3. AVERAGE SPEED BANNER (The core feature)
        avg_bg = (16, 185, 129) if avg_speed <= 90 else (239, 68, 68)
        draw.rounded_rectangle([140, 590, 940, 720], radius=20, fill=(19, 29, 49), outline=avg_bg, width=3)
        draw.text((540, 630), "VELOCIDAD MEDIA DENTRO DEL TRAMO", font=font_label, fill=(203, 213, 225), anchor="mm")
        draw.text((540, 680), f"{avg_speed:.1f} KM/H  •  LEGAL", font=font_title, fill=avg_bg, anchor="mm")

        # 4. Tramo Progress Bar
        draw.text((150, 755), "Progreso en el tramo:", font=font_label, fill=(148, 163, 184))
        draw.rounded_rectangle([140, 790, 940, 815], radius=10, fill=(51, 65, 85))
        draw.rounded_rectangle([140, 790, 140 + int(800 * progress), 815], radius=10, fill=(56, 189, 248))

        # 5. Satellite Map with route
        frame.paste(map_img.resize((800, 360)), (140, 840))
        # Draw vehicle position on map
        car_x = 200 + int(600 * progress)
        draw.ellipse([car_x - 18, 1020 - 18, car_x + 18, 1020 + 18], fill=(56, 189, 248), outline=(255, 255, 255), width=4)

        # 6. Wind sensor badge at bottom of cockpit
        draw.rounded_rectangle([140, 1230, 940, 1370], radius=18, fill=(16, 185, 129, 40), outline=(16, 185, 129), width=2)
        draw.text((540, 1275), "💨 RACHAS LATERALES: 12 KM/H", font=font_sub, fill=(255, 255, 255), anchor="mm")
        draw.text((540, 1330), "🛡️ TOLDO Y VEHÍCULO SEGUROS", font=font_title, fill=(52, 211, 153), anchor="mm")

    # SCENE 3: CALL TO ACTION (8.5s to end)
    else:
        # Bouncing logo
        bounce = int(abs(math.sin((t - 8.5) * 5)) * 20)
        frame.paste(logo_img_large, (540 - 160, 260 - bounce), logo_img_large)

        draw.text((540, 640), "CamperSites Pro", font=font_hook, fill=(255, 255, 255), anchor="mm")
        draw.text((540, 715), "La App de Cabina para Campers", font=font_title, fill=(56, 189, 248), anchor="mm")

        # Feature bullet points card
        draw.rounded_rectangle([110, 780, 970, 1230], radius=28, fill=(19, 29, 49), outline=(51, 65, 85), width=2)
        features = [
            "🗺️  +517.000 Spots y Campings en Europa",
            "🚨  Radares DGT Oficiales Fijos y de Tramo",
            "💨  Sensor de Viento y Alerta de Toldo",
            "⚡  Navegación 100% Offline (Sin Cobertura)",
            "🆓  Totalmente Gratis y Sin Suscripciones"
        ]
        y_pos = 830
        for feat in features:
            draw.text((150, y_pos), feat, font=font_sub, fill=(241, 245, 249))
            y_pos += 76

        # Big CTA Download Button (Pulsing)
        draw.rounded_rectangle([90, 1300, 990, 1440], radius=24, fill=(16, 185, 129), outline=(255, 255, 255), width=3)
        draw.text((540, 1370), "DESCARGA GRATIS EN MI BIO 📲", font=font_btn, fill=(255, 255, 255), anchor="mm")

        draw.text((540, 1490), "Compatible con cualquier móvil o tablet Android", font=font_label, fill=(148, 163, 184), anchor="mm")
        draw.text((540, 1560), "@campersites_oficial_es", font=font_title, fill=(254, 44, 85), anchor="mm")

    # Bottom ticker on all frames
    draw.rectangle([0, 1820, 1080, 1920], fill=(7, 13, 24))
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

# Clean up frames
shutil.rmtree(FRAMES_DIR, ignore_errors=True)

print(f"✅ ¡VÍDEO VIRAL GENERADO CON ÉXITO!")
print(f"📁 Ruta: {OUTPUT_VIDEO}")
file_size = os.path.getsize(OUTPUT_VIDEO) / (1024 * 1024)
print(f"📦 Tamaño: {file_size:.2f} MB")
