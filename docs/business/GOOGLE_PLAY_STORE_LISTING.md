# 📱 Guía y Plantilla Oficial para Google Play Console — CamperSites Pro

**Desarrollado por:** Nexus Studio (Nexus AI Holding)  
**ID del Paquete (applicationId):** `com.campersitespro`  
**Versión Inicial:** `1.0.0` (Código de versión `1`)  
**Política de Privacidad Oficial:** `https://nexus-ia-holding.github.io/CamperSites-Pro/privacy.html`  
**Términos de Servicio:** `https://nexus-ia-holding.github.io/CamperSites-Pro/terms.html`  
**Soporte:** `equipo-ia@proton.me`  

---

## 1. Ficha Principal de Play Store (Store Listing)

### 🏷️ Nombre de la Aplicación (Máx. 30 caracteres)
```text
CamperSites Pro: Camper & GPS
```

### 📝 Descripción Breve (Máx. 80 caracteres)
```text
Navegación GPS y mapas offline para campers y autocaravanas con radares y spots.
```

### 📄 Descripción Completa (Formato optimizado ASO / SEO)
```text
🚐 CamperSites Pro — La Suite de Navegación de Cabina Inteligente y Cartografía Libre para Caravaning en España y Europa.

Diseñada por y para amantes de la vida sobre ruedas, furgonetas camper, autocaravanas y vehículos recreativos. Olvídate de quedarte sin cobertura en pistas de montaña o dudar si un puente tiene altura suficiente.

🌟 CARACTERÍSTICAS PRINCIPALES

🗺️ MÁS DE 517.000 PUNTOS VERIFICADOS EN EUROPA
• Campings oficiales y parkings autorizados para pernoctar con seguridad.
• Áreas de servicio públicas y privadas con vaciado de aguas grises/negras, recarga de agua potable, electricidad y GLP / Autogas.
• Información comunitaria de ocupación en tiempo real (sitio libre, pocas plazas o completo).

📍 MARCADO LIBRE EN EL MAPA (PULSACIÓN PROLONGADA)
• Mantén pulsado en cualquier lugar del mapa (una cala secreta, un claro o un mirador).
• Calcula al instante varias alternativas de ruta (la más rápida vs secundaria panorámica) comparando tiempos, desniveles y radares.
• Guárdalo en tu lista de Favoritos disponible 100% offline.

🚨 AVISADOR DE RADARES DGT Y SEGURIDAD EN RUTA
• Base de datos oficial y legal de radares de la DGT, Servei Català de Trànsit y Trafikoa.
• Avisos de voz inteligentes a 1.000 m y recordatorio a 300 m.
• HUD específico para radares de tramo: calcula tu velocidad media real dentro del túnel o tramo vigilado.

💨 SENSOR DE RACHAS DE VIENTO Y RECOMENDACIÓN DE TOLDO
• Información meteorológica de micro-clima en cada punto.
• Alerta de seguridad para apertura o repliegue inmediato del toldo exterior ante ráfagas repentinas.

⚡ NAVEGACIÓN Y CARTOGRAFÍA 100% OFFLINE
• Descarga completa del callejero y los spots de toda España y Europa con 1 solo clic.
• Continúa navegando con precisión de cabina sin consumir datos móviles ni depender de cobertura.

🛡️ PRIVACIDAD Y SEGURIDAD
• Sin venta de datos personales a terceros.
• Cumplimiento riguroso del Reglamento General de Protección de Datos (RGPD) de la UE.

Desarrollado con orgullo por Nexus Studio (Nexus AI Holding).
```

---

## 2. Clasificación del Contenido (IARC / PEGI)

Rellena el cuestionario de clasificación de contenido en Google Play Console con estas respuestas:

| Pregunta | Respuesta | Justificación |
| :--- | :--- | :--- |
| **Categoría** | Utilidad / Mapas y Navegación | Herramienta de asistencia en viaje. |
| **Violencia** | NO | No contiene violencia ni combate. |
| **Lenguaje soez** | NO | No contiene vocabulario ofensivo. |
| **Sustancias controladas** | NO | No promueve alcohol, tabaco ni drogas. |
| **Compras digitales integradas**| SÍ (si activas suscripción) | Funciones de mapas offline / premium. |
| **Ubicación física compartida** | SÍ | Comparte la ubicación en tiempo real con el motor de mapas local. |
| **Resultado esperado** | **PEGI 3** / **Para Todos (Everyone)** | Apto para todos los públicos. |

---

## 3. Seguridad de los Datos (Data Safety Section)

Google Play exige declarar cómo se tratan los datos. Marca estas casillas exactamente:

### A. Ubicación (Location)
* **¿Recopila o comparte datos de ubicación?** SÍ
* **Tipos:** Ubicación precisa y ubicación aproximada.
* **¿Se comparten con terceros?** NO (se procesan localmente en el dispositivo para navegación por GPS).
* **Finalidad:** Funcionalidad de la aplicación (Navegación en vivo y avisos de proximidad de radares).
* **¿Es efímera?** SÍ (se procesa en tiempo real en memoria del dispositivo).

### B. Información personal (Personal Info)
* **Correo electrónico:** Opcional (solo si el usuario decide registrarse para sincronizar favoritos).
* **¿Se comparte con terceros?** NO.
* **Finalidad:** Gestión de cuentas y autenticación.

### C. Prácticas de Seguridad
* **Cifrado en tránsito:** SÍ (todas las conexiones usan HTTPS / TLS 1.3).
* **Mecanismo de solicitud de eliminación de cuenta:** SÍ (a través del correo `privacy@nexusaiholding.com`).

---

## 4. Declaración de Servicios en Primer Plano (Foreground Service)

CamperSites Pro incluye el permiso `FOREGROUND_SERVICE_LOCATION`. Google Play requiere justificar su uso:

* **Tipo de servicio en primer plano:** `Location` (Ubicación).
* **Justificación para el revisor de Google Play:**
  > *"CamperSites Pro es una aplicación de asistencia a la conducción y navegación de cabina para vehículos recreativos. Requiere el servicio en primer plano con notificación permanente mientras el usuario se encuentra al volante para continuar recibiendo alertas de audio de radares oficiales y avisos de gálibo/viento incluso si la pantalla se atenúa para ahorrar batería o si el conductor cambia momentáneamente a otra aplicación de audio/llamadas."*

---

## 5. Credenciales de Firma de Producción (Upload Keystore)

El almacén de claves ya está generado e integrado en el proyecto:

* **Archivo de firma:** `android/app/release.keystore`
* **Alias de la clave:** `campersites-release-key`
* **Contraseña del almacén (Store Password):** `camperpro2026`
* **Contraseña de la clave (Key Password):** `camperpro2026`
* **Huella Digital SHA-1:** `95:E6:62:74:FD:89:6C:21:39:83:09:09:5C:F5:9A:89:5B:7C:C8:66`
* **Huella Digital SHA-256:** `F4:F3:4C:F0:00:49:C9:EB:60:67:A1:98:41:41:38:86:88:FB:4D:3A:52:70:8E:C2:EE:F5:55:F7:E9:DD:83:A2`
* **Validez:** 10.000 días (~27 años).

---

## 6. Generación del Bundle (.aab) para Subir a Google Play

Para compilar el archivo `.aab` listo para subir a la consola de Google Play, simplemente ejecuta en la terminal:

```bash
npm run build:playstore
```

O directamente:
```bash
bash scripts/build-playstore-bundle.sh
```

El archivo resultante se generará en:
`CamperSites-Pro-GooglePlay-v1.0.0.aab`
