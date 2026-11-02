# 🚐 CamperSites Pro - Instalación Rápida

## 📋 Requisitos Previos

### Necesario:
- **Node.js** versión 18 o superior ([Descargar](https://nodejs.org/))
- **npm** o **yarn** (viene con Node.js)
- **Git** instalado

### Para Android:
- **Android Studio** ([Descargar](https://developer.android.com/studio))
- JDK 17 o superior
- Un dispositivo Android físico o emulador

### Para iOS (solo macOS):
- **Xcode** desde App Store
- **CocoaPods**: `sudo gem install cocoapods`

---

## 🚀 Instalación Paso a Paso

### 1️⃣ Clonar el Repositorio

```bash
git clone https://github.com/TU_USUARIO/CamperSites-Pro.git
cd CamperSites-Pro
```

### 2️⃣ Instalar Dependencias

```bash
npm install
# o si usas yarn
yarn install
```

### 3️⃣ Configurar Variables de Entorno

El proyecto ya incluye un archivo `.env` con configuración de demostración. Para producción:

```bash
# Copiar plantilla
cp .env.example .env

# Editar .env con tus credenciales
# - Supabase: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
# - Mapbox (opcional): https://account.mapbox.com/access-tokens/
```

**Nota:** La app funciona en modo offline si no configuras las API keys.

### 4️⃣ Configurar Android

#### Opción A: Usando Android Studio (Recomendado)
1. Abre Android Studio
2. File → Open → Selecciona la carpeta `android`
3. Espera a que termine Gradle sync
4. Click en ▶️ Run

#### Opción B: Desde terminal
```bash
# Conectar dispositivo o iniciar emulador
npm run android
```

### 5️⃣ Configurar iOS (solo macOS)

```bash
cd ios
pod install
cd ..
npm run ios
```

---

## 🛠️ Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm start` | Inicia Metro Bundler |
| `npm run android` | Ejecuta en Android |
| `npm run ios` | Ejecuta en iOS |
| `npm run lint` | Verifica código |
| `npm run build:android` | Genera APK release |

---

## 🔧 Solución de Problemas Comunes

### Error: "Command failed with exit code 1"
```bash
# Limpiar caché
npm start -- --reset-cache

# Reinstalar dependencias
rm -rf node_modules
npm install
```

### Error en Android: "SDK not found"
1. Abre Android Studio
2. Tools → SDK Manager
3. Instala Android SDK Platform 33+
4. Instala Build-Tools 33.x

### Error en iOS: "Podfile not found"
```bash
cd ios
pod install --repo-update
cd ..
```

### Metro Bundler no inicia
```bash
# Matar procesos
killall -9 node
npx react-native start --reset-cache
```

---

## 📱 Primeros Pasos

1. **Regístrate** en la app con email y contraseña
2. **Explora el mapa** para ver áreas de autocaravanas cercanas
3. **Filtra por categorías**: Camping, Parking, Servicios, Naturaleza
4. **Guarda favoritos** para acceso rápido
5. **Activa GPS** para alertas de radares y controles

---

## 🎯 Características Principales

✅ **15 categorías** de áreas para autocaravanas  
✅ **GPS nativo** con navegación integrada  
✅ **Alertas en tiempo real** de radares y controles  
✅ **Modo offline** completo  
✅ **Interfaz 3D moderna** y animaciones fluidas  
✅ **60 FPS** constante  

---

## 📞 Soporte

- 📧 Email: soporte@camper-sites.com
- 💬 Issues: [GitHub Issues](https://github.com/TU_USUARIO/CamperSites-Pro/issues)
- 📖 Documentación: Ver archivos `README.md`, `CONFIG.md`

---

## 📄 Licencia

Este proyecto es privado. Todos los derechos reservados © 2024 CamperSites Pro - YRYS
