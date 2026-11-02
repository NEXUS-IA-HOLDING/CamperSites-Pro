# 🚐 CamperSites Pro — Cockpit & Offline Navigation Suite

<div align="center">

[![Descargar APK](https://img.shields.io/badge/DESCARGAR%20APK-v1.0.0%20(Directo)-00C853?style=for-the-badge&logo=android&logoColor=white)](https://github.com/elkalivpn/CamperSites-Pro/releases/download/v1.0.0/CamperSites-Pro-v1.0.apk)
[![GitHub Release](https://img.shields.io/github/v/release/elkalivpn/CamperSites-Pro?style=for-the-badge&color=0284C7)](https://github.com/elkalivpn/CamperSites-Pro/releases)
[![License](https://img.shields.io/badge/Licencia-MIT-amber?style=for-the-badge)](LICENSE)
[![React Native](https://img.shields.io/badge/React%20Native-0.72.6-61DAFB?style=for-the-badge&logo=react)](https://reactnative.dev/)
[![Offline Spots](https://img.shields.io/badge/Puntos%20Verificados-%2B517.000%20Spots-10B981?style=for-the-badge&logo=openstreetmap)](https://openstreetmap.org)

**La suite de navegación GPS de cabina y cartografía libre más completa para furgonetas camper, autocaravanas y vehículos habitables en España y Europa.**

[📥 Descargar APK](#-descarga-rápida-en-1-clic) • [✨ Características](#-características-principales) • [🗺️ Navegación de Cabina](#-suite-de-cabina-inteligente) • [📂 Documentación](#-documentación-completa) • [🛠️ Desarrollo](#-instalación-para-desarrolladores)

</div>

---

## 📥 Descarga Rápida en 1 Clic

Para instalar y probar **CamperSites Pro** directamente en cualquier smartphone o tablet Android:

1. Haz clic en el botón de descarga:
   👉 **[Descargar CamperSites-Pro-v1.0.apk (45 MB)](https://github.com/elkalivpn/CamperSites-Pro/releases/download/v1.0.0/CamperSites-Pro-v1.0.apk)**
2. Abre el archivo descargado en tu dispositivo móvil.
3. Pulsa **Instalar** (permite *"Instalar aplicaciones de fuentes desconocidas"* si tu sistema lo solicita).
4. ¡Listo! La app abrirá con acceso completo a los mapas, radares DGT y pernoctas.

---

## ✨ Características Principales

### 🗺️ +517.000 Puntos Camper en Europa
- **Campings oficiales**, áreas públicas y privadas de autocaravanas, parkings permitidos y zonas de pernocta libre.
- **Puntos de servicio:** Vaciado de aguas grises/negras, recarga de agua potable, electricidad y puntos de GLP / Autogas.
- **Previsión meteorológica y viento:** Sensores en tiempo real de rachas de viento lateral, heladas y recomendación de seguridad para desplegar o recoger el toldo exterior.

### 📍 Marcado Libre en el Mapa (Pulsación Prolongada)
- Navega libremente por el mapa y **mantén pulsado en cualquier lugar** (una cala secreta, un claro en el bosque o un mirador).
- **Vibración háptica y chincheta personalizada** con anillo de pulso en las coordenadas exactas.
- **Dos acciones instantáneas:**
  - 🛣️ **Calcular Varias Rutas:** Traza la ruta más rápida y alternativas secundarias/paisajísticas, comparando kilómetros, tiempos y radares antes de salir.
  - ⭐ **Guardar en Favoritos:** Asigna un nombre personalizado (ej. *"Cala Secreta"*) y consérvalo sincronizado y disponible 100% offline.

### 🚨 Radares DGT y Avisos de Tráfico en Tiempo Real
- **Radares DGT verificados:** Fijos, de tramo, semáforo, túnel y controles policiales.
- **Alertas de proximidad escalonadas:** Avisos por voz (TTS nativo) a 1.000 m y recordatorio a 300 m.
- **HUD de radares de tramo:** Muestra velocidad media calculada vs límite legal dentro del tramo.

### 💾 Bóveda de Puntos y Mapas 100% Offline
- **Descarga todo en 1 clic:** Un solo botón para almacenar los paquetes de España y Europa en el almacenamiento local.
- Navegación, búsqueda de áreas y consulta de servicios sin necesidad de conexión de datos ni cobertura móvil.

### 🛡️ Blindaje de Seguridad y Control de Acceso
- **Protección contra Prompt Injection:** Normalización de homoglyphs cirílicos/griegos, anulación de directivas y bloqueo de jailbreaks (DAN/AIM) en el asistente inteligente.
- **Sanitización de fugas:** Filtro automático que neutraliza cualquier intento de exfiltración de tokens JWT o configuraciones internas.
- **Panel de Administración Maestro:** Protegido por autenticación RBAC estricta (restringido a credenciales maestras autorizadas).

---

## 🚘 Suite de Cabina Inteligente

CamperSites Pro incluye una interfaz diseñada específicamente para ser operada con seguridad al volante:

| Módulo | Funcionalidad |
| :--- | :--- |
| **HUD Automotriz** | Velocímetro digital GPS + señal circular de velocidad máxima permitida por tramo. |
| **Auto-Zoom Adaptativo** | Ajuste milimétrico de la cámara según la velocidad del vehículo (visión amplia a 120 km/h, zoom cenital en cruces a < 30 km/h). |
| **Snap-to-Road** | Imantación del vehículo a la calzada con rumbo 360° para evitar saltos o pérdida de orientación. |
| **Asistente de Carril** | Indicador gráfico anticipado de qué carril tomar en bifurcaciones y salidas de autovía. |
| **Control de Tacógrafo** | Alertas para descanso obligatorio cada 4h 30m adaptado a vehículos de gran tonelaje y normativa europea. |
| **Vehículos 360°** | Selector de cursor personalizable: Camper Capuchina, Perfilada, Gran Volumen, Integral o 4x4 Overland. |

---

## 📂 Documentación Completa

Toda la documentación técnica, arquitectónica y de negocio está organizada en la carpeta [`docs/`](docs/):

- **Guías de Puesta en Marcha:**
  - [`docs/setup/INICIO-RAPIDO.md`](docs/setup/INICIO-RAPIDO.md) — Guía exprés de 5 minutos.
  - [`docs/setup/INSTALL.md`](docs/setup/INSTALL.md) — Manual de instalación paso a paso.
  - [`docs/setup/CONFIG.md`](docs/setup/CONFIG.md) — Configuración de variables de entorno.
- **Seguridad y Blindaje:**
  - [`docs/security/AI_SECURITY_IMPLEMENTATION.md`](docs/security/AI_SECURITY_IMPLEMENTATION.md) — Sistema de defensas contra prompt injection y sanitización.
  - [`docs/security/SECURITY_CREDENTIALS.md`](docs/security/SECURITY_CREDENTIALS.md) — Gestión segura de credenciales y hashes administrativos.
  - [`SECURITY.md`](SECURITY.md) — Política de reporte de vulnerabilidades.
- **Arquitectura y Rendimiento:**
  - [`docs/architecture/CAMPERSITES_PRO.md`](docs/architecture/CAMPERSITES_PRO.md) — Especificación técnica global de la plataforma.
  - [`docs/architecture/OPTIMIZACIONES_REALIZADAS.md`](docs/architecture/OPTIMIZACIONES_REALIZADAS.md) — Técnicas de renderizado a 60 FPS y gestión de memoria.
  - [`docs/architecture/PERFORMANCE_CONFIG.md`](docs/architecture/PERFORMANCE_CONFIG.md) — Benchmarks y optimización del motor Hermes.
- **Monetización y Alianzas:**
  - [`docs/business/AFFILIATE_PROGRAM.md`](docs/business/AFFILIATE_PROGRAM.md) — Programa de partners B2B (ferries, seguros camper, GLP).
  - [`docs/business/MARKETING_AND_PLAYSTORE_LAUNCH_PLAN.md`](docs/business/MARKETING_AND_PLAYSTORE_LAUNCH_PLAN.md) — Estrategia de lanzamiento en Google Play Store.

---

## 🛠️ Instalación para Desarrolladores

### Requisitos Previos
- Node.js 18+ y npm
- Android SDK / Java JDK 17
- CocoaPods (para compilaciones en macOS/iOS)

### Pasos de Configuración:

```bash
# 1. Clonar el repositorio
git clone https://github.com/elkalivpn/CamperSites-Pro.git
cd CamperSites-Pro

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env

# 4. Ejecutar en dispositivo o emulador Android
npm run android

# 5. Ejecutar verificaciones de tipos
npm run typecheck
```

---

## 📄 Licencia y Legal

- **Licencia:** Distribuido bajo la licencia [MIT](LICENSE).
- **Términos de Servicio:** Consulta [`TERMS_OF_SERVICE.md`](TERMS_OF_SERVICE.md).
- **Política de Privacidad:** Consulta [`PRIVACY_POLICY.md`](PRIVACY_POLICY.md).
- **Seguridad:** Consulta [`SECURITY.md`](SECURITY.md).

---

<div align="center">
Desarrollado con dedicación para la comunidad camper y autocaravanista. 🚐✨
</div>
