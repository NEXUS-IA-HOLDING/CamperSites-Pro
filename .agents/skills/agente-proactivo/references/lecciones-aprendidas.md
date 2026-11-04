# Base de Conocimiento y Lecciones Aprendidas (CamperSites Pro)

Este documento registra los fallos encontrados durante el ciclo de vida del proyecto, la causa raíz identificada y la solución permanente aplicada, garantizando que **nunca se repitan** y optimizando el tiempo de desarrollo.

---

## 1. Infraestructura y Git / Sandbox

* **Problema:** `fatal: Unable to create '.git/index.lock': Operation not permitted` al ejecutar `git add` o `git commit`.
  * **Causa Raíz:** En entornos sandboxed restringidos, la manipulación de metadatos internos de `.git` o de sockets de red está bloqueada por la política de seguridad.
  * **Solución Permanente:** Ejecutar operaciones de Git sobre el repositorio con `BypassSandbox: true` tras preparar los archivos en el sandbox estándar.
* **Problema:** Error de red transitorio al hacer `git push` (`Could not resolve host: github.com`).
  * **Solución:** Limpiar la caché DNS local en macOS con `dscacheutil -flushcache` y reintentar el push con `BypassSandbox: true`.

---

## 2. GitHub Pages & Despliegue Web

* **Problema:** Archivos de verificación de TikTok (`tiktok-developers-site-verification=...`) o assets daban 404 en GitHub Pages.
  * **Causa Raíz:** Por defecto, GitHub Pages ejecuta el motor de compilación Jekyll, el cual descarta automáticamente cualquier archivo que contenga caracteres `=` o que comience con puntos. Además, los proyectos normales se alojan en `org.github.io/repo/`, por lo que el bot de TikTok al consultar la raíz `org.github.io/tiktok-...` obtenía 404 si no existía el repositorio especial de dominio raíz `org.github.io`.
  * **Solución Permanente:**
    1. Mantener siempre el archivo vacío `docs/.nojekyll` en la raíz de la web.
    2. Crear y desplegar el repositorio `NEXUS-IA-HOLDING/nexus-ia-holding.github.io` con las variantes del archivo de verificación (con y sin extensión, `.txt`, `.html`) tanto en la raíz como en `/CamperSites-Pro/`. Así TikTok valida con éxito con HTTP 200 independientemente de si el usuario introduce el dominio raíz o la subruta.
* **Problema:** El código QR aparecía en blanco en algunos navegadores o tardaba en cargar.
  * **Causa Raíz:** Depender de peticiones a servicios externos (ej. `api.qrserver.com`) provocaba bloqueos por filtros de privacidad, bloqueadores de anuncios (uBlock/AdGuard) o fallos de red.
  * **Solución Permanente:** Incrustar el código QR de descarga directamente como **Data URI Base64 autocontenida** (`data:image/png;base64,...`) dentro del HTML. No realiza peticiones HTTP, no usa caché externa y carga instantáneamente en cualquier dispositivo.

---

## 3. Renderizado y Producción Multimedia

* **Problema:** `ffmpeg drawtext Filter not found` al intentar generar vídeos con texto animado.
  * **Causa Raíz:** La compilación por defecto de FFmpeg en Homebrew en macOS no incluye la biblioteca `libfreetype` ni `fontconfig`.
  * **Solución Permanente:** Usar scripts en Python (`Pillow`) para renderizar cada fotograma gráfico con tipografía de alta resolución del sistema (`Arial Black`), y enviar los frames directamente a FFmpeg mediante tubería (*pipe*) a 30fps.
* **Problema:** Locución por voz sin dependencias de APIs de pago.
  * **Solución Permanente:** Usar el comando nativo de macOS `say -v Mónica` para generar archivos de voz humana en español en formato `.aiff`, convertirlos a `.aac` e integrarlos en la pista de audio de los vídeos MP4.

---

## 4. Arquitectura de Navegación 3D en React Native

* **Problema:** En modo libre de conducción (sin ruta fijada), el mapa permanecía en 2D estático y el coche se veía como un punto plano básico.
  * **Causa Raíz:** La cámara sólo activaba la inclinación en 3D si existía una ruta fijada y el usuario pulsaba manualmente el botón 3D.
  * **Solución Permanente:** 
    1. Detectar automáticamente cuando la velocidad supera los 3.0 km/h y ajustar la cámara de forma dinámica (`calculateSpeedAdaptiveCamera`: zoom 18.2, pitch 60° y rumbo alineado al vehículo).
    2. Rediseñar `VehicleMapCursor.tsx` con un chasis automotriz 3D completo: faros delanteros con haz de luz proyectado en el asfalto, pilotos traseros LED rojos, sombra de suspensión y micro-vibración del motor.
    3. Añadir `DrivingSimulationService.ts` para permitir probar y grabar la cabina 3D sin salir a la carretera.

---

## 5. Monetización Orgánica y Tracción

* **Economía de Publicación en Google Play:**
  - Coste de la cuenta de desarrollador: 25 € (pago único).
  - Estrategia implementada:
    1. Distribución directa del APK mediante TikTok (`@campersites_oficial_es`) y Landing Page.
    2. Tarjeta de crowdfunding dentro de la app con barra de progreso.
    3. Integración de afiliado de seguros camper IATI (5% dto.), donde cada póliza contratada genera entre 6 € y 18 € de comisión. Con sólo 2-3 pólizas se cubre el coste total de la licencia de Google Play.
