#!/bin/bash

# ============================================
# CamperSites Pro - Script de Instalación Automática
# YRYS - Instalador multiplataforma para móviles y tablets
# ============================================
# Este script detecta automáticamente el sistema operativo
# e instala todas las dependencias necesarias para ejecutar la app.
#
# Uso: ./setup.sh
# ============================================

set -e  # Detener en caso de error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de logging
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Detectar sistema operativo
detect_os() {
    log_info "Detectando sistema operativo..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        log_success "macOS detectado"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        log_success "Linux detectado"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        OS="windows"
        log_success "Windows detectado"
    else
        OS="unknown"
        log_warning "Sistema operativo no reconocido: $OSTYPE"
    fi
}

# Verificar Node.js
check_nodejs() {
    log_info "Verificando Node.js..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js no está instalado"
        install_nodejs
    else
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 18 ]; then
            log_warning "Node.js versión $NODE_VERSION es menor a 18"
            install_nodejs
        else
            log_success "Node.js $(node -v) instalado"
        fi
    fi
}

# Instalar Node.js
install_nodejs() {
    log_info "Instalando Node.js 18+..."
    
    case $OS in
        macos)
            if command -v brew &> /dev/null; then
                brew install node@18
            else
                log_error "Homebrew no está instalado. Instálalo desde https://brew.sh"
                exit 1
            fi
            ;;
        linux)
            if command -v apt-get &> /dev/null; then
                curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
                sudo apt-get install -y nodejs
            elif command -v yum &> /dev/null; then
                curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
                sudo yum install -y nodejs
            else
                log_error "Gestor de paquetes no soportado. Instala Node.js manualmente"
                exit 1
            fi
            ;;
        windows)
            log_error "En Windows, instala Node.js desde https://nodejs.org"
            exit 1
            ;;
    esac
    
    log_success "Node.js instalado"
}

# Verificar npm
check_npm() {
    log_info "Verificando npm..."
    
    if ! command -v npm &> /dev/null; then
        log_error "npm no está instalado"
        exit 1
    else
        log_success "npm $(npm -v) instalado"
    fi
}

# Verificar Java (para Android)
check_java() {
    log_info "Verificando Java JDK..."
    
    if ! command -v java &> /dev/null; then
        log_warning "Java no está instalado (necesario para Android)"
        install_java
    else
        JAVA_VERSION=$(java -version 2>&1 | head -n1 | cut -d'"' -f2 | cut -d'.' -f1)
        log_success "Java $(java -version 2>&1 | head -n1 | cut -d'"' -f2) instalado"
    fi
}

# Instalar Java
install_java() {
    log_info "Instalando Java JDK 17..."
    
    case $OS in
        macos)
            if command -v brew &> /dev/null; then
                brew install openjdk@17
            else
                log_error "Homebrew no está instalado"
                exit 1
            fi
            ;;
        linux)
            if command -v apt-get &> /dev/null; then
                sudo apt-get update
                sudo apt-get install -y openjdk-17-jdk
            elif command -v yum &> /dev/null; then
                sudo yum install -y java-17-openjdk-devel
            else
                log_warning "Instala Java JDK 17 manualmente desde https://adoptium.net"
            fi
            ;;
        windows)
            log_warning "En Windows, instala Java JDK 17 desde https://adoptium.net"
            ;;
    esac
}

# Verificar Android Studio (opcional)
check_android_studio() {
    log_info "Verificando Android Studio..."
    
    if [ "$OS" = "macos" ] && [ -d "/Applications/Android Studio.app" ]; then
        log_success "Android Studio detectado"
    elif [ "$OS" = "linux" ] && [ -d "$HOME/android-studio" ]; then
        log_success "Android Studio detectado"
    elif [ "$OS" = "windows" ] && [ -d "$LOCALAPPDATA/Android/Sdk" ]; then
        log_success "Android SDK detectado"
    else
        log_warning "Android Studio no detectado (opcional para desarrollo Android)"
    fi
}

# Verificar Xcode (solo macOS, opcional para iOS)
check_xcode() {
    if [ "$OS" = "macos" ]; then
        log_info "Verificando Xcode..."
        
        if xcode-select -p &> /dev/null; then
            log_success "Xcode Command Line Tools instalado"
        else
            log_warning "Xcode no está instalado (necesario para iOS)"
            log_info "Para instalar iOS, ejecuta: xcode-select --install"
        fi
        
        if command -v pod &> /dev/null; then
            log_success "CocoaPods instalado"
        else
            log_info "Instalando CocoaPods..."
            sudo gem install cocoapods
            log_success "CocoaPods instalado"
        fi
    fi
}

# Crear archivo .env si no existe
setup_env() {
    log_info "Configurando variables de entorno..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_success "Archivo .env creado desde .env.example"
            log_warning "Edita .env con tus credenciales de Supabase"
        else
            log_warning "No se encontró .env.example"
        fi
    else
        log_success "Archivo .env ya existe"
    fi
}

# Instalar dependencias de Node
install_dependencies() {
    log_info "Instalando dependencias de Node.js..."
    
    npm install
    
    log_success "Dependencias instaladas"
}

# Configurar iOS (solo macOS)
setup_ios() {
    if [ "$OS" = "macos" ]; then
        log_info "Configurando iOS..."
        
        cd ios
        pod install
        cd ..
        
        log_success "iOS configurado"
    fi
}

# Mostrar instrucciones finales
show_next_steps() {
    echo ""
    echo "============================================"
    log_success "¡Instalación completada!"
    echo "============================================"
    echo ""
    echo "Próximos pasos:"
    echo ""
    echo "1. ${YELLOW}Configura Supabase:${NC}"
    echo "   - Crea un proyecto en https://supabase.com"
    echo "   - Ejecuta el script: npm run setup-database"
    echo "   - Edita .env con tus credenciales"
    echo ""
    echo "2. ${YELLOW}Ejecutar la app:${NC}"
    if [ "$OS" = "macos" ]; then
        echo "   - Android: npm run android"
        echo "   - iOS: npm run ios"
    elif [ "$OS" = "linux" ]; then
        echo "   - Android: npm run android"
        echo "   - iOS: Solo disponible en macOS"
    elif [ "$OS" = "windows" ]; then
        echo "   - Android: npm run android"
        echo "   - iOS: Solo disponible en macOS"
    fi
    echo ""
    echo "3. ${YELLOW}Generar iconos (opcional):${NC}"
    echo "   - Usa https://icon.kitchen para generar iconos"
    echo "   - Reemplaza los archivos en android/app/src/main/res/"
    echo "   - Para iOS, reemplaza ios/CamperSitesTemp/Images.xcassets/AppIcon.appiconset/"
    echo ""
    echo "4. ${YELLOW}Cargar datos de ejemplo:${NC}"
    echo "   - npm run scrape"
    echo "   - npm run verify-radares"
    echo ""
    echo "============================================"
    echo ""
}

# Main
main() {
    echo ""
    echo "============================================"
    echo "  CamperSites Pro - Instalador Automático"
    echo "============================================"
    echo ""
    
    detect_os
    check_nodejs
    check_npm
    check_java
    check_android_studio
    check_xcode
    setup_env
    install_dependencies
    setup_ios
    show_next_steps
}

# Ejecutar main
main
