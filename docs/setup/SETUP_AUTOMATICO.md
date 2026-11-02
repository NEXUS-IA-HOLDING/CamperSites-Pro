# 🚀 Guía de Instalación Automática - CamperSites Pro

## Instalación en 1 Paso

Para usuarios que quieren instalar la app rápidamente:

```bash
# Clonar o descargar el repositorio
git clone <URL_DEL_REPOSITORIO>
cd CamperSites-Pro

# Ejecutar script de instalación automática
./setup.sh
```

El script automáticamente:
- ✅ Detecta tu sistema operativo (macOS, Linux, Windows)
- ✅ Verifica e instala Node.js 18+ si es necesario
- ✅ Verifica e instala Java JDK 17 para Android
- ✅ Configura CocoaPods para iOS (solo macOS)
- ✅ Crea el archivo `.env` desde la plantilla
- ✅ Instala todas las dependencias de Node.js
- ✅ Muestra instrucciones personalizadas según tu SO

---

## Configuración Manual (Opcional)

### 1. Variables de Entorno

Edita el archivo `.env` con tus credenciales:

```bash
# Supabase - Base de datos y autenticación
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key-aqui

# Mapbox - Opcional (usa OpenStreetMap por defecto)
MAPBOX_ACCESS_TOKEN=pk.demo

# Open Street View - Opcional
OPEN_STREET_VIEW_KEY=tu-api-key-aqui
```

**Importante:** La app funciona sin estas credenciales en modo offline, pero no tendrá datos sincronizados.

### 2. Configurar Supabase

#### Opción A: Dashboard Web (Recomendado)
1. Ve a https://app.supabase.com
2. Crea un nuevo proyecto
3. Ve a SQL Editor
4. Copia y pega el contenido de `supabase/schema.sql`
5. Ejecuta el script

#### Opción B: CLI de Supabase
```bash
# Instalar CLI
npm install -g supabase

# Login
supabase login

# Vincular proyecto
supabase link --project-ref TU_PROJECT_ID

# Ejecutar migraciones
supabase db push
```

#### Opción C: Script Automático
```bash
npm run setup-database
```

---

## Ejecutar la App

### Android (Todos los sistemas)
```bash
npm run android
```

### iOS (Solo macOS)
```bash
npm run ios
```

---

## Generar Iconos Personalizados

### Para Android
1. Ve a https://icon.kitchen
2. Sube tu logo
3. Descarga el ZIP
4. Extrae en `android/app/src/main/res/`

### Para iOS
1. Usa https://appicon.co
2. Descarga los iconos
3. Reemplaza en `ios/CamperSitesTemp/Images.xcassets/AppIcon.appiconset/`

---

## Cargar Datos de Ejemplo

```bash
# Scrapear datos de OpenStreetMap
npm run scrape

# Verificar radares DGT
npm run verify-radares

# Subir datos a Supabase
npm run upload
```

---

## Solución de Problemas

### Error: "Node.js no está instalado"
```bash
# macOS
brew install node@18

# Linux (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows
# Descargar desde https://nodejs.org
```

### Error: "Java no está instalado"
```bash
# macOS
brew install openjdk@17

# Linux (Ubuntu/Debian)
sudo apt-get install -y openjdk-17-jdk

# Windows
# Descargar desde https://adoptium.net
```

### Error: "CocoaPods no está instalado" (iOS)
```bash
sudo gem install cocoapods
```

### Error: "Android SDK no configurado"
1. Instala Android Studio
2. Abre Android Studio > Settings > Languages & Frameworks > Android SDK
3. Instala Android SDK Platform y SDK Tools
4. Configura ANDROID_HOME:
   ```bash
   # macOS
   export ANDROID_HOME=$HOME/Library/Android/sdk
   
   # Linux
   export ANDROID_HOME=$HOME/Android/Sdk
   
   # Windows (PowerShell)
   $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
   ```

---

## Requisitos del Sistema

### Mínimos
- **RAM:** 8 GB
- **Disco:** 10 GB libres
- **Node.js:** 18+
- **npm:** 9+

### Recomendados
- **RAM:** 16 GB
- **Disco:** 20 GB libres
- **SSD:** Sí
- **macOS:** 12+ (para desarrollo iOS)

---

## Soporte

Si tienes problemas:
1. Revisa este documento
2. Consulta el README.md
3. Abre un issue en GitHub

---

**Versión:** 1.0.0  
**Última actualización:** 2025
