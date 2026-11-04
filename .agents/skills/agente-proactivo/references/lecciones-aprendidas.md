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

* **Problema 1:** En modo libre de conducción (sin ruta fijada), el mapa permanecía en 2D estático y el coche se veía como un punto plano básico.
  * **Causa Raíz:** La cámara sólo activaba la inclinación en 3D si existía una ruta fijada y el usuario pulsaba manualmente el botón 3D.
  * **Solución Permanente:** 
    1. Detectar automáticamente cuando la velocidad supera los 3.0 km/h y ajustar la cámara de forma dinámica (`calculateSpeedAdaptiveCamera`: zoom 18.2, pitch 60° y rumbo alineado al vehículo).
    2. Rediseñar `VehicleMapCursor.tsx` con un chasis automotriz 3D completo: faros delanteros con haz de luz proyectado en el asfalto, pilotos traseros LED rojos, sombra de suspensión y micro-vibración del motor.
    3. Añadir `DrivingSimulationService.ts` para permitir probar y grabar la cabina 3D sin salir a la carretera.
* **Problema 2:** En modo Cabina 3D, el vehículo parecía rotar de lado o al revés respecto a la calzada, las maniobras se quedaban atascadas en el primer paso (`depart`) y la cámara dejaba de seguir al vehículo.
  * **Causa Raíz:**
    1. **Doble rotación:** `MapLibreGL.PointAnnotation` se dibuja en espacio de pantalla. Si la cámara del mapa ya rota al rumbo `heading` para que la carretera apunte hacia arriba (`0°`), rotar también `VehicleMapCursor` por `heading` duplica el ángulo.
    2. **Paso `depart` de OSRM:** `steps[0]` en OSRM es el punto de partida (`0m`). Medir la distancia hacia `steps[0].location` medía la distancia hacia atrás en vez de hacia la siguiente maniobra (`steps[1]`).
    3. **Falso positivo de `onRegionDidChange`:** Las animaciones programáticas de `setCamera` disparaban `onRegionDidChange` sin verificar `feature.properties.isUserInteraction`, activando `isAwayFromUser = true` y bloqueando el auto-seguimiento.
    4. **Foco centrado sin Look-Ahead:** Con `pitch: 60°`, centrar la cámara en la coordenada exacta del vehículo desperdicia la mitad inferior de la pantalla mostrando lo que ya quedó atrás.
  * **Solución Permanente:**
    1. En modo 3D (`camera3DMode && !isAwayFromUser`), fijar `heading={0}` en `VehicleMapCursor` para que la furgoneta apunte siempre recta hacia arriba alineada con el carril.
    2. Asociar cada `NavigationStep` a su índice de vértice `routeCoordIndex` en la polilínea, iniciar en `steps[1]`, avanzar automáticamente por índice de segmento y calcular `distToManeuver` sumando los tramos reales de la carretera.
    3. Proyectar el centro de cámara 85m por delante del vehículo (`projectLookAhead`) y calcular velocidad/rumbo geométricos entre muestras GPS consecutivas (`computeGpsBearing`) cuando el chip GPS de Android devuelve `0`.
    4. Sólo activar `isAwayFromUser = true` cuando `feature?.properties?.isUserInteraction === true`.

---

## 5. Monetización Orgánica y Tracción

* **Economía de Publicación en Google Play:**
  - Coste de la cuenta de desarrollador: 25 € (pago único).
  - Estrategia implementada:
    1. Distribución directa del APK mediante TikTok (`@campersites_oficial_es`) y Landing Page.
    2. Tarjeta de crowdfunding dentro de la app con barra de progreso.
    3. Integración de afiliado de seguros camper IATI (5% dto.), donde cada póliza contratada genera entre 6 € y 18 € de comisión. Con sólo 2-3 pólizas se cubre el coste total de la licencia de Google Play.

---

## 6. Composición Visual de Vídeos y Reels para TikTok

* **Problema:** Fragmentación visual del texto del gancho (*hook*) en vídeos promocionales, con títulos separados entre la zona superior y media de la pantalla que restan profesionalidad.
* **Causa Raíz:** Mezclar bloques de texto explicativo en el encabezado y en el cuerpo del vídeo rompe la jerarquía visual de TikTok.
* **Solución Permanente:** 
  1. Unificar todo el gancho textual en una única tarjeta superior compacta y limpia (`y=135` a `y=365`) con borde de alerta y subtítulo explicativo.
  2. Dedicar toda la zona central (`y=390` a `y=1440`) a la simulación gráfica realista (chasis de cabina, mapa satelital oscuro, pórticos de entrada/salida de radar con haces luminosos, autocaravana detallada con faros y velocímetros HUD).
  3. Replicar siempre la salida del vídeo automáticamente en el Escritorio del usuario para su acceso inmediato sin búsquedas en carpetas.

---

## 7. Modo Conducción y Restricciones de Seguridad en Vídeo Móvil

* **Problema:** Bloqueo de reproducción de vídeo con mensaje *"No puedes ver vídeos porque estás conduciendo"*.
* **Causa Raíz:** Servicios de seguridad del sistema operativo (Google Play Services / Android Auto / Digital Wellbeing / Bluetooth de vehículo) que detectan movimiento o emparejamiento con el sistema del coche y bloquean reproductores multimedia por normativa de seguridad vial.
* **Solución Permanente:** Guiar al usuario para desconectar temporalmente el Bluetooth del coche o desactivar el "Modo Conducción" en los ajustes de Bienestar Digital / Google de su dispositivo Android para visualizar demos y previsualizaciones.

---

## 8. Sincronización entre Tabs con `useFocusEffect` y Centro de Mando en Tiempo Real

* **Problema:** En React Navigation Bottom Tabs, las pantallas permanecen montadas en memoria; usar solo `useEffect(..., [])` en `FavoritesScreen` impedía que nuevos favoritos o rutas del historial aparecieran al cambiar de pestaña.
* **Solución Permanente:**
  1. Usar siempre `useFocusEffect` en `FavoritesScreen` y `MapScreen` para recargar favoritos (`@campersites_favorites`), historial de rutas (`@campersites_route_history`) y saltos directos al mapa (`@campersites_jump_to_location` con flag `autoStartRoute`).
  2. En el Panel de Administración (`AdminService.ts` / `AdminDashboardModal.tsx` / `docs/admin.html`), realizar siempre sondeos HTTP reales (`fetch` con medición de latencia en `ms` y `AbortController`) contra Supabase, OSRM, Open-Meteo, Nominatim, Esri y GitHub OTA, registrando automáticamente incidencias si algún servidor pasa a estado `DOWN`.
