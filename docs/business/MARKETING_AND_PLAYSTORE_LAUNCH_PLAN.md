# 🚀 Plan Maestro de Lanzamiento, Publicación en Google Play y Estrategia de Marketing — CamperSites Pro

**Documento Estratégico y Técnico de Producción**  
**Versión de la App:** 1.0.0 (Android / iOS)  
**Autor:** YRYS / CamperSites Pro Core Team  

---

## PARTE 1: Guía Técnica de Publicación en Google Play Store

### 1.1 Requisitos Previos en Google Play Console
1. **Cuenta de Desarrollador Google Play:** Registro en [Google Play Console](https://play.google.com/console) (tasa única de 25 $).
2. **Generación de Keystore de Producción:**
   Para firmar la versión definitiva de subida a la tienda, se ejecuta:
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore android/app/campersites-release.keystore -alias campersites-key -keyalg RSA -keysize 2048 -validity 10000
   ```
   *(Guardar la contraseña y el archivo fuera del control de Git; `.gitignore` ya lo protege).*
3. **Generación del Android App Bundle (AAB):**
   Google Play ya no admite APKs sueltos para nuevas aplicaciones; exige el formato `.aab` que reduce el peso de descarga para el usuario:
   ```bash
   cd android && JAVA_HOME=/opt/homebrew/opt/openjdk@17 ANDROID_HOME=/Users/mrhardcore/Library/Android/sdk ./gradlew bundleRelease
   ```
   *Ruta de salida:* `android/app/build/outputs/bundle/release/app-release.aab`.

---

### 1.2 Ficha de la Aplicación y Optimización ASO (App Store Optimization)

#### **Metadatos Oficiales para Máximo Posicionamiento:**
* **Nombre de la App (30 caracteres):**  
  `CamperSites Pro: GPS Autocaravana`
* **Descripción Breve (80 caracteres):**  
  `Navegación GPS camper y camión con alertas de gálibo, radares DGT y áreas 100% offline.`
* **Descripción Completa (Palabras Clave de Alto Tráfico):**
  > ¿Viajas en autocaravana, furgoneta camper, camión o turismo? **CamperSites Pro** es el copiloto inteligente definitivo que combina la potencia de un navegador profesional de cabina con la mayor base de datos de áreas camper, pernoctas seguras y radares oficiales.
  >
  > 🗺️ **RUTAS ADAPTADAS A TU VEHÍCULO (GÁLIBO Y TONELAJE):**
  > Introduce la altura, anchura, longitud y peso de tu vehículo. Nuestra cartografía calcula itinerarios seguros evitando puentes bajos, túneles estrechos, calles peatonales y pistas impracticables.
  >
  > 🚨 **SISTEMA DE SEGURIDAD Y RADARES DGT EN TIEMPO REAL:**
  > Avisos por voz de radares fijos, radares de tramo con cálculo de velocidad media, cámaras de cinturón/móvil y controles de tráfico oficiales.
  >
  > 🏕️ **MÁS DE 25.000 UBICACIONES VERIFICADAS:**
  > Áreas de servicio, campings, parkings autorizados, puntos de vaciado de aguas grises/negras, recarga de agua potable, electricidad 220V y estaciones con AutoGas GLP y AdBlue.
  >
  > 🛰️ **CARTOGRAFÍA SATELITAL HD & MODO NOCHE TÁCTICO:**
  > Vista satelital real de alta resolución, auto-zoom adaptativo en cruces y modo nocturno sin deslumbramiento en cabina.
  >
  > 📶 **FUNCIONAMIENTO 100% OFFLINE:**
  > Navega y busca servicios sin cobertura móvil ni consumo de datos.

#### **Recursos Gráficos Requeridos:**
1. **Icono de la App:** 512 x 512 px (PNG de 32 bits con fondo opaco).
2. **Gráfico de Funciones (Banner):** 1024 x 500 px (Horizontal, mostrando la cabina 3D nocturna y el velocímetro HUD).
3. **Capturas de Pantalla (Mínimo 4 por factor de forma):**
   - *Teléfono (Vertical 1080 x 2400 px)*: 
     1. Mapa satelital con ruta segura y alerta de gálibo.
     2. Velocímetro táctico con radar de tramo y velocidad media.
     3. Ficha de área camper con servicios de vaciado y reserva de parcela.
     4. Selector de perfiles de vehículo (medidas en metros y MMA).
   - *Tablets de 7 y 10 pulgadas (Horizontal)*: Vista de cabina de salpicadero a pantalla completa.

---

### 1.3 Mapeo Exhaustivo del Cuestionario Data Safety de Google Play Console

Para dar cumplimiento estricto a las políticas de privacidad y transparencia de Google Play Store, se detalla a continuación el mapeo exacto de todas las secciones del formulario de **Seguridad de los Datos (Data Safety)**:

| Categoría de Datos | Tipo Específico | ¿Se recopila? | ¿Se comparte con terceros? | ¿Procesamiento efímero? | ¿Es opcional? | Finalidades Declaradas en Play Console | Medidas de Cifrado y Retención |
|---|---|---|---|---|---|---|---|
| **Ubicación** | Ubicación precisa (`ACCESS_FINE_LOCATION`) | **SÍ** | **NO** | **SÍ** (las coordenadas se procesan en la memoria volátil del dispositivo para el velocímetro HUD, detección de cruces, avisos de radar y alertas de gálibo). | Opcional (el catálogo y mapa estático pueden explorarse sin GPS). | 1. Funcionalidad de la app (Navegación turn-by-turn y alertas de radares DGT en ruta). | Cifrado en tránsito (TLS 1.3). Nunca se almacena en bases de datos externas. |
| **Ubicación** | Ubicación aproximada (`ACCESS_COARSE_LOCATION`) | **SÍ** | **NO** | **SÍ** (localización inicial rápida de provincia o comarca para filtrar spots cercanos). | Opcional. | 1. Funcionalidad de la app. | Cifrado en tránsito (TLS 1.3). |
| **Información Personal** | Correo electrónico | **SÍ** | **NO** | **NO** (se almacena de forma persistente en Supabase Auth UE únicamente si el usuario decide registrarse). | Opcional (la app incluye modo invitado 100% funcional sin registro). | 1. Gestión de cuentas.<br>2. Confirmación y gestión de reservas B2B.<br>3. Prevención de abusos. | Cifrado en tránsito (TLS 1.3) y en reposo (AES-256 en servidores Supabase UE). |
| **Información Personal** | Nombre de usuario / Alias | **SÍ** | **NO** | **NO** (perfil público de autoría). | Opcional. | 1. Gestión de cuentas.<br>2. Autoría de reseñas y reportes comunitarios de radares y áreas. | Cifrado en tránsito (TLS 1.3) y en reposo (AES-256). |
| **Identificadores** | ID de usuario (UUID) | **SÍ** | **NO** | **NO** (clave primaria criptográfica generada por Supabase Auth). | Opcional (solo usuarios con cuenta). | 1. Funcionalidad de la app.<br>2. Vinculación de reservas B2B y monedero CamperRewards. | Cifrado en tránsito (TLS 1.3) y en reposo (AES-256). |
| **Identificadores** | Huella de dispositivo / ID anti-fraude | **SÍ** | **NO** | **SÍ** (hash criptográfico temporal utilizado para restringir a 3 intentos por hora accesos indebidos a configuración y mitigación de fuerza bruta). | Obligatorio para funciones de seguridad del sistema. | 1. Seguridad de la app y prevención de fraude. | Cifrado en tránsito (TLS 1.3). No correlacionable con identidad real del usuario. |
| **Datos Financieros** | Información de tarjetas o cuentas bancarias | **NO** | **NO** | N/A (todas las transacciones de suscripción Pro se procesan directamente mediante Google Play Billing; los datos bancarios nunca tocan la app). | N/A | N/A | Protocolos nativos de Google Play Billing API. |

#### Prácticas de Seguridad y Gobernanza de Datos Declaradas:
- **Cifrado en tránsito:** Todos los intercambios de red entre el dispositivo y las APIs de Supabase o servicios de mapas utilizan HTTPS con TLS 1.3 y suites criptográficas modernas.
- **Cifrado en reposo:** Bases de datos alojadas en centro de datos dentro de la Unión Europea (cumplimiento RGPD) cifradas mediante AES-256.
- **Mecanismo de solicitud de eliminación de cuenta (Google Play Account Deletion Policy):** En cumplimiento del Artículo 17 del RGPD y de la política de eliminación de cuentas de Google Play, cualquier usuario registrado puede solicitar el borrado permanente e instantáneo de su perfil y datos asociados desde la propia pantalla de Ajustes de la app o a través de la URL oficial:
  - **URL de eliminación directa:** `https://campersites.pro/delete-account`
  - **Canal de soporte de privacidad:** `privacy@campersites.pro` / `security@campersites.pro`

---

### 1.4 Declaración y Justificación de Permiso FOREGROUND_SERVICE_LOCATION

Para cumplir con la política de Servicios en Primer Plano de Google Play (obligatoria en Android 14 / API 34+):

#### 1. Justificación Técnica y de Experiencia de Usuario:
CamperSites Pro es un sistema de cabina y navegación turn-by-turn de alta precisión especialmente diseñado para vehículos recreativos de gran gálibo (autocaravanas integrales, campers de gran volumen L2H2/L3H2 y camiones vivienda). La aplicación requiere declarar y ejecutar `android.permission.FOREGROUND_SERVICE_LOCATION` respaldado por `LocationForegroundService` por las siguientes razones críticas:

1. **Radares de Tramo DGT con cálculo de velocidad media en tiempo real ($v = \frac{\Delta d}{\Delta t}$):**
   - En la red viaria española, los radares de tramo monitorizados por la DGT abarcan distancias de entre 3 y 15 kilómetros (por ejemplo, túneles de Guadarrama en la AP-6 o túneles de Vielha).
   - Para calcular la velocidad media acumulada con exactitud legal, el sistema requiere un muestreo continuo de geoposición a una frecuencia de **1 muestra por segundo (1 Hz)**:
     $$\bar{v} = \frac{\sum \Delta d_i}{\sum \Delta t_i}$$
   - Si el sistema operativo aplicara la gestión estándar de batería de Android (Doze mode o throttling de ubicación en background a intervalos de varios minutos), la velocidad media calculada divergiría drásticamente de la real, privando al conductor de advertencias de exceso o induciendo a sanciones económicas graves.

2. **Alertas Críticas de Gálibo y Altura a 90 km/h:**
   - Una autocaravana con 3,20 metros de altura requiere una distancia de frenado y reacción mínima de **300 metros** ante un paso inferior o puente bajo con gálibo de 2,80 metros.
   - Circulando a la velocidad máxima permitida para este tipo de vehículos en autovía/carretera convencional (**90 km/h**, equivalente a **25 metros por segundo**):
     $$\text{Tiempo de colisión a 300 m} = \frac{300\,\text{m}}{25\,\text{m/s}} = 12\,\text{segundos}$$
   - Un retraso de tan solo 10 segundos en la recepción de la coordenada GPS debido a la suspensión de tareas en segundo plano reduciría la distancia de frenado a 50 metros, imposibilitando la detención segura del vehículo y provocando un siniestro de choque frontal contra la estructura del puente.

3. **Uso Táctico de Cabina con Pantalla Apagada o Navegación en Segundo Plano:**
   - Durante viajes de larga distancia (600–900 km), los conductores habitualmente apagan la pantalla de su dispositivo montado en el salpicadero para mitigar el sobrecalentamiento térmico generado por la radiación solar directa sobre el parabrisas.
   - Asimismo, el conductor puede cambiar temporalmente a la aplicación de llamadas telefónicas manos libres.
   - El servicio en primer plano garantiza que el motor de síntesis de voz (TTS) continúe monitorizando la aproximación a radares y puentes bajos emitiendo las advertencias sonoras obligatorias ("Atención: Radar de tramo a 80 km/h en 500 metros") sin interrupción.

#### 2. Notificación en Primer Plano Persistente:
Para asegurar que el usuario esté plenamente informado en todo momento del consumo del sensor de ubicación:
- **Identificador de canal (Channel ID):** `campersites_cockpit_channel`
- **Nombre visible en ajustes:** `"CamperSites Navegación & Radares"`
- **Título de la notificación:** `"CamperSites Pro • Cockpit Activo"`
- **Texto descriptivo:** `"Monitorización de radares DGT y alertas de gálibo"`
- **Icono del sistema:** `android.R.drawable.ic_dialog_info`
- **Propiedad Ongoing:** `setOngoing(true)` (la notificación no se puede descartar accidentalmente mientras el modo navegación o cockpit continúe activo).
- **Control de usuario:** Cuenta con acción en la app para detener el servicio inmediatamente pulsando "Finalizar Ruta" o cerrando el modo Cockpit.

#### 3. Divulgación Destacada en la Aplicación (Prominent In-App Disclosure):
De acuerdo con las directrices de privacidad de Google Play, antes de solicitar los permisos en tiempo de ejecución (`ACCESS_FINE_LOCATION`, `FOREGROUND_SERVICE` y `FOREGROUND_SERVICE_LOCATION`), la aplicación despliega un diálogo informativo modal no cancelable con el siguiente texto literal:
> *"CamperSites Pro recopila y procesa tus datos de ubicación en tiempo real mientras conduces o navegas, incluso cuando la aplicación está en segundo plano o la pantalla está apagada. Esto permite calcular con precisión matemática tu velocidad media en radares de tramo DGT y emitir alertas sonoras para evitar puentes bajos adaptados a la altura de tu vehículo. Tus coordenadas no se venden ni se comparten con anunciantes ni terceros."*

#### 4. Especificaciones del Vídeo Demostrativo para Revisores de Google Play:
En el envío a Google Play Console se adjuntará el enlace al vídeo demostrativo (YouTube no listado o Google Drive público):
- **Duración máxima:** 60 a 90 segundos.
- **Puntos indispensables mostrados en pantalla:**
  1. Inicio de la aplicación y aceptación explícita de la pantalla de divulgación destacada.
  2. Inicio de una sesión de conducción / modo cockpit.
  3. Minimización de la aplicación (pulsación del botón Inicio de Android).
  4. Despliegue de la cortina de notificaciones del sistema donde se aprecia con claridad la notificación en primer plano fija de `campersites_cockpit_channel`.
  5. Demostración sonora donde la app emite una alerta por voz TTS de aproximación a radar de tramo con la aplicación en segundo plano.

---

### 1.5 Cuestionario de Clasificación de Contenido
- **Certificación PEGI / IARC:** PEGI 3 / Para todos los públicos (sin violencia, lenguaje soez, compras de azar ni contenido sensible).

---

## PARTE 2: Publicación en Canales Alternativos

Para no depender exclusivamente de Google Play y llegar a los miles de usuarios que utilizan tablets de salpicadero sin Google Play Services:

1. **Descarga Directa Oficial desde Web (Web APK Sideloading):**
   - Alojar `CamperSites-Pro-v1.0.apk` en `https://campersites.pro/descargar`.
   - Ofrecer actualización automática in-app comprobando versiones desde el bucket de Supabase.
2. **Huawei AppGallery:** Muy extendida en autocaravanas y campers por tablets económicas de alta durabilidad.
3. **Amazon Appstore:** Permite instalar CamperSites Pro directamente en las tablets **Amazon Fire HD 8 / 10**, las más vendidas como pantallas fijas de navegación camper.
4. **Apple App Store (iOS):** Subida a TestFlight para usuarios de iPhone y iPad.

---

## PARTE 3: Plan de Marketing, Tráfico y Crecimiento Viral

```
                                  🎯 EMBUDO DE MARKETING VANLIFE
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. ADQUISICIÓN ORGÁNICA (Comunidades y Foros Camper)                                        │
│    • Publicaciones técnicas en Furgovw.org, ACPasión, CamperVanSpain y Forocoches (Rutas).  │
│    • Grupos de Facebook (+300k miembros): Autocaravanas España, FurgoAdictos, Vanlife Spain.│
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. MARKETING DE CREADORES DE CONTENIDO (YouTubers & Instagrammers)                          │
│    • Campaña "Reto del Puente Bajo": Vídeos cortos (Reels/Shorts/TikTok) mostrando cómo     │
│      Google Maps te mete bajo un puente de 2.6m y CamperSites Pro te desvía con seguridad. │
│    • Cuentas Pro vitalicias + Código de afiliado (20% de comisión recurrente) a 15 canales. │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. ACUERDOS B2B Y EMPRESAS DE ALQUILER                                                      │
│    • Alianzas con plataformas de alquiler: Indie Campers, Roadsurfer, Yescapa.             │
│    • El cliente que alquila recibe un folleto QR para descargar la app como guía de viaje. │
│    • Adhesión de las 3.000 áreas camper privadas de España a la Central de Reservas.        │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 4. CAMPAÑAS DE PAGO DE ALTO RENDIMIENTO (Google UAC & Meta Ads)                             │
│    • Google UAC enfocado a búsquedas: "mapa camper", "radares dgt", "donde pernoctar".      │
│    • Retargeting antes de festivos clave: Semana Santa, Puente de Mayo, Verano, Navidad.   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 El "Efecto Viral" en Redes Sociales (TikTok e Instagram)
El contenido con más reproducciones en el mundo camper es el de **incidentes evitados por altura**:
- Grabar un clip corto de cabina donde la app avisa: *"¡Atención! Peligro de gálibo a 300 metros: Puente a 2.80m, recalculando ruta segura"*.
- Este tipo de contenido supera con facilidad las 100.000 reproducciones orgánicas porque aborda el mayor miedo de cualquier conductor de furgón o autocaravana.

### 3.2 Alianzas Estratégicas Institucionales
- Presentación formal a las principales asociaciones de usuarios: **PACAR** (Plataforma Autocaravanas Autónomas), **La Paca**, y **FEAA** (Federación Española de Asociaciones Autocaravanistas).
- Presencia en el **Salón Internacional del Caravaning** (Fira Barcelona) y **AutoCaravaning Madrid**, distribuyendo tarjetas NFC y códigos QR de bienvenida con 50 CamperPoints de regalo.

---

### 3.3 Playbook Operativo de Foros Especializados (Guerrilla Marketing Comunitario)

En el ecosistema vanlife y autocaravanista de España, la recomendación entre iguales en foros históricos genera ratios de conversión e instalación de mayor retención y fidelidad que la publicidad programática. Se implementan dos campañas operativas directas con copys listos para publicación:

#### 1. Campaña Furgovw.org (Comunidad Camper y Gran Volumen L2H2/L3H2)
- **Subforo Destino:** *"Zona Camper > Furgoperfectos / Tecnología, GPS y Cartografía"*
- **Enfoque:** Aporte desinteresado de cartografía colaborativa de puentes bajos y radares (estrictamente no spam publicitario).
- **Parámetros UTM de Enlace:** `https://campersites.pro?utm_source=furgovw&utm_medium=community_forum&utm_campaign=galibo_puentes_2026`
- **Plantilla de Mensaje Oficial:**
  > **Asunto:** *[Aporte/Herramienta] Base de datos de gálibo de puentes bajos en España + radares de tramo DGT actualizados para furgos altas*
  >
  > *Buenas tardes a toda la comunidad de Furgovw,*
  >
  > *Como muchos de los que viajamos en furgonetas gran volumen (Ducato, Boxer, Jumper en L2H2 o L3H2) o con techo elevable/placas solares, el mayor susto en ruta es encontrarse de repente en una carretera comarcal o travesía de pueblo con un túnel o puente de 2,60 m donde Google Maps te ha metido sin contemplar las dimensiones del vehículo.*
  >
  > *Durante los últimos meses hemos estado compilando y validando una base de datos georreferenciada con más de 1.800 pasos inferiores y puentes con gálibo limitado (< 3,40 m) de la red viaria de España, integrándola junto a los radares oficiales de la DGT con cálculo de velocidad media en radares de tramo.*
  >
  > *Hemos volcado toda esta inteligencia en **CamperSites Pro**, una app Android desarrollada íntegramente en España pensada por y para gente que duerme sobre ruedas. Funciona al 100% offline (sin cobertura ni consumo de datos).*
  >
  > *Para los foreros de Furgovw hemos habilitado el código comunitario:  
  > 🏷️ **`FURGOVW2026`**  
  > (Introduce el código en Ajustes > Cupones para activar las alertas de radar avanzadas y descarga de provincias offline de forma completamente gratuita).*
  >
  > *Os agradeceríamos enormemente cualquier reporte de nuevos pasos estrechos o correcciones de altura en vuestra zona para seguir blindando la seguridad de todos en carretera.*
  >
  > *¡Nos vemos en los furgoperfectos!*

#### 2. Campaña ACPasión (Foro Decano de Autocaravanas y Vehículos > 3.500 kg)
- **Subforo Destino:** *"Navegadores, GPS, Puntos de Interés / Autocaravanismo"*
- **Enfoque:** Cumplimiento normativo (Instrucción 08/V-74 de la DGT sobre estacionamiento vs. acampada) y prevención de sanciones por peso/longitud en cascos históricos.
- **Parámetros UTM de Enlace:** `https://campersites.pro?utm_source=acpasion&utm_medium=forum_thread&utm_campaign=dgt_radars_galibo`
- **Plantilla de Mensaje Oficial:**
  > **Asunto:** *Navegador GPS adaptado a altura (>3m) y peso autocaravana con alerta de radares de tramo DGT*
  >
  > *Estimados compañeros de ruta y autocaravanistas:*
  >
  > *Es de sobra conocido el debate continuo y las dificultades que afrontamos con los navegadores convencionales de turismo (Google Maps, Waze), los cuales ignoran por completo que conducimos vehículos de 3,00 a 3,30 metros de altura, 7 metros de eslora y masas que rondan las 3,5 toneladas. Más de un compañero ha sufrido daños severos en el capuchino o se ha visto encajonado en un casco urbano con señalización de prohibido pesados.*
  >
  > *Queremos presentar a la comunidad **CamperSites Pro**, un software de cabina adaptativo en el que puedes parametrizar las cotas exactas de tu autocaravana (altura libre, longitud total y MMA). La cartografía calcula trayectos descartando automáticamente viaductos con gálibo inferior y vías restringidas, e incorpora alertas vocales de radares fijos y de tramo de la DGT calculando tu velocidad media real segundo a segundo.*
  >
  > *Asimismo, integra el inventario de más de 3.500 áreas de servicio y pernocta con información verificada de llenado y vaciado de aguas grises/negras.*
  >
  > *Podéis descargar y probar la versión completa para Android utilizando la invitación de la comunidad autocaravanista:  
  > 🏷️ **`ACPASIONPRO`**  
  >
  > *Cualquier sugerencia técnica sobre rutas de montaña o áreas municipales con limitaciones especiales será implementada en las actualizaciones quincenales.*
  >
  > *Un cordial saludo y buena ruta.*

---

### 3.4 Embudo de Micro-Influencers Vanlife y Estructura de Comisiones de 2 Niveles

Para escalar la adquisición orgánica a coste variable y generar viralidad en plataformas de vídeo vertical (TikTok, Instagram Reels y YouTube Shorts), se estructura la campaña oficial **"El Reto del Puente Bajo"**:

```
                       📱 EMBUDO VIRAL VERTICAL (TIKTOK / REELS / SHORTS)
  [Gancho de Pánico (0-3s)]  ──▶ [Contraste Táctico (4-12s)]  ──▶ [Solución y CTA (13-30s)]
  "Casi arranco el techo"        Maps vs CamperSites Pro           "Descarga + Código Creador"
                                          │
                                          ▼
                       💰 ESTRUCTURA DE COMISIONES (2 TIER)
    ┌──────────────────────────────────────────────┬──────────────────────────────────────────────┐
    │ TIER 1 (Micro-Creadores: 5k - 15k seguidores) │ TIER 2 (Embajadores Pro: 15k - 50k seguidores)│
    ├──────────────────────────────────────────────┼──────────────────────────────────────────────┤
    │ • Licencia CamperSites Pro Vitalicia         │ • Kit físico de soporte salpicadero de regalo│
    │ • Código descuento 20%: `CREADOR10`          │ • Landing personalizada campersites.pro/alias│
    │ • 25% de comisión neta mensual recurrente    │ • 30% de comisión neta mensual recurrente    │
    │ • Pago automático mensual vía Stripe/PayPal  │ • Sorteo de 5 suscripciones anuales comunidad│
    └──────────────────────────────────────────────┴──────────────────────────────────────────────┘
```

#### 1. Storyboard de Producción para Vídeo Corto (Formato 9:16 — 30 Segundos):
- **Segundo 00 a 03 — Gancho Visual y Retención:**
  - *Plano de cámara:* Grabación real en primera persona desde el salpicadero acercándose a un paso subterráneo con señalética de 2,70 m.
  - *Texto en pantalla (amarillo de advertencia):* *"El momento exacto en que casi destrozo el techo de la camper de 65.000 € por hacer caso a Google Maps 😱"*.
  - *Audio:* Sonido de frenada o respiración agitada.
- **Segundo 04 a 12 — Contraste de Software en Pantalla Dividida:**
  - *Izquierda:* Google Maps indicando alegremente "Continúe recto 200 metros".
  - *Derecha:* CamperSites Pro activando el modo HUD nocturno en rojo: *"¡ALERTA DE GÁLIBO! Altura límite 2.70 m. Desvío obligatorio a la derecha"*.
  - *Voz en off:* *"Los navegadores normales no saben lo que mide tu furgoneta ni calculan los radares de tramo DGT. Esta app española sí."*
- **Segundo 13 a 20 — Configuración Sencilla en 2 Clics:**
  - *Pantalla:* Demostración de cómo se introduce la altura (ej. 2,95 m) y peso (3.500 kg) en el perfil del vehículo.
  - *Voz en off:* *"Pones las medidas de tu furgón o autocaravana una sola vez y nunca más viajas con el corazón en un puño."*
- **Segundo 21 a 30 — Llamada a la Acción (CTA) y Conversión:**
  - *Pantalla:* Gráfico mostrando descarga en Google Play + código exclusivo en pantalla.
  - *Texto & Voz:* *"Descarga gratis CamperSites Pro en Google Play y usa mi código `[ALIAS10]` para un 20% de descuento y mapas offline vitalicios. Enlace directo en mi biografía."*

#### 2. Estructura Formal de Afiliación y Comisiones de Creadores (2 Tiers):
1. **Tier 1 — Micro-Creadores de Nicho (5.000 a 15.000 seguidores en Instagram / TikTok):**
   - **Requisitos:** Creador con contenido enfocado exclusivamente en camperizaciones DIY, rutas de fin de semana o vida nómada.
   - **Beneficios otorgados:**
     - Licencia Pro vitalicia con acceso a todos los mapas provinciales offline y radares.
     - Código promocional exclusivo (`[ALIAS]20`) que otorga un 20% de descuento a su audiencia.
     - **Comisión de Afiliación:** **25% de comisión neta recurrente** sobre todas las suscripciones mensuales o anuales generadas por su código o enlace de referido.
     - Panel de control de afiliado para monitorizar clics, descargas y cobros mensuales.

2. **Tier 2 — Embajadores de Marca de Referencia (15.000 a 50.000+ seguidores):**
   - **Requisitos:** Viajeros a tiempo completo en autocaravana o camper, creadores de contenido regular en YouTube con series de rutas por Europa o Marruecos.
   - **Beneficios otorgados:**
     - Todos los beneficios de Tier 1.
     - Envío gratuito de kit de soporte táctico magnético reforzado para salpicadero con carga rápida.
     - Creación de Landing Page personalizada (ej. `https://campersites.pro/embajadores/nomadas-en-ruta`).
     - **Comisión de Afiliación:** **30% de comisión neta recurrente**.
     - Pack de 5 licencias anuales gratuitas para sortear en directos o publicaciones de sorteo en sus redes.
     - Mención destacada de su canal de viajes en la sección "Rutas recomendadas" de la app.

#### 3. Esquema de Atribución y UTMs de Creadores:
Cada creador dispone de su identificador unificado `creator_id`:
`https://campersites.pro/app?utm_source=creator_[ALIAS]&utm_medium=short_video&utm_campaign=reto_puente_bajo&coupon=[ALIAS]20`
El enlace persiste la cookie de atribución durante 30 días garantizando la asignación justa de la comisión aun si la instalación y suscripción final se produce días después del visionado del clip.

