# 🔐 Seguridad y Credenciales - CamperSites Pro

## ⚠️ IMPORTANTE: Este archivo es CONFIDENCIAL

Este documento explica cómo configurar las credenciales de administrador de forma **segura** sin exponerlas en GitHub.

---

## 🚫 Lo que NUNCA debes hacer

1. ❌ **NUNCA** pongas códigos admin reales en el código fuente
2. ❌ **NUNCA** commitees el archivo `.env` a Git
3. ❌ **NUNCA** compartas tus códigos admin en foros públicos
4. ❌ **NUNCA** uses los códigos de ejemplo en producción

---

## ✅ Configuración Segura de Códigos Admin

### Paso 1: Crear tu archivo .env local

```bash
# Copia el archivo de ejemplo
cp .env.example .env
```

### Paso 2: Generar hashes para tus códigos

Elige códigos secretos únicos y genera sus hashes:

```bash
# Para el código master (acceso total)
npm run generate-admin-hash -- MiCodigoMasterSecreto2024!

# Para el código test (testing)
npm run generate-admin-hash -- MiCodigoTest2024

# Para el código support (soporte)
npm run generate-admin-hash -- MiCodigoSupport2024
```

El script te mostrará algo como:
```
✅ Hash generado exitosamente:

┌─────────────────────────────────────────┐
│ Código: MiCodigoMasterSecreto2024!      │
│ Hash:   a3f7c9e2b1d4f8a6                │
└─────────────────────────────────────────┘

📝 Agrega este hash a tu archivo .env:

EXPO_PUBLIC_ADMIN_MASTER_HASH=a3f7c9e2b1d4f8a6
```

### Paso 3: Configurar tu archivo .env

Edita `.env` y agrega los hashes generados:

```env
# ===========================================
# CÓDIGOS DE ADMINISTRADOR - SEGURO
# ===========================================

# Código maestro para activar modo admin completo
EXPO_PUBLIC_MASTER_ADMIN_CODE=MiCodigoMasterSecreto2024!

# Hashes generados con el script
EXPO_PUBLIC_ADMIN_MASTER_HASH=a3f7c9e2b1d4f8a6
EXPO_PUBLIC_ADMIN_TEST_HASH=b8e4d0f3c2e5g9b7
EXPO_PUBLIC_ADMIN_SUPPORT_HASH=c9f5e1g4d3f6h0c8

# Salt único para tu proyecto (CAMBIAR en producción)
EXPO_PUBLIC_ADMIN_SALT=TuSaltUnicoParaEsteProyecto2024!
```

### Paso 4: Verificar que .env está en .gitignore

```bash
# Deberías ver esto en .gitignore
.env
.env.local
.env.*
```

---

## 🔒 Medidas de Seguridad Implementadas

### 1. Códigos Hasheados
Los códigos no se almacenan en texto plano en el código fuente. Solo los hashes están disponibles.

### 2. Rate Limiting
Máximo 3 intentos por hora para prevenir ataques de fuerza bruta.

### 3. Device Fingerprinting
Las sesiones admin están vinculadas al dispositivo específico donde se activaron.

### 4. Expiración Automática
Las sesiones admin expiran después de 24 horas automáticamente.

### 5. Logging de Auditoría
Todos los intentos de activación (exitosos y fallidos) se registran para auditoría.

### 6. Validación Server-Side (Opcional)
En producción, los códigos deben validarse contra la base de datos usando Supabase Edge Functions.

---

## 📋 Checklist de Seguridad para Producción

Antes de desplegar a producción, verifica:

- [ ] Cambiar el `EXPO_PUBLIC_ADMIN_SALT` a un valor único
- [ ] Generar nuevos hashes con el nuevo salt
- [ ] Eliminar cualquier código hardcodeado del repositorio
- [ ] Configurar validación server-side en Supabase
- [ ] Habilitar MFA para activaciones de nivel master
- [ ] Configurar alertas de seguridad en Supabase
- [ ] Rotar códigos periódicamente (cada 3-6 meses)
- [ ] Monitorear logs de auditoría regularmente

---

## 🔄 Rotación de Códigos

Para rotar códigos de forma segura:

1. Generar nuevos códigos y hashes
2. Actualizar el archivo `.env` en el servidor
3. Actualizar la tabla `admin_codes` en Supabase
4. Invalidar sesiones activas (opcional)
5. Notificar a administradores autorizados

---

## 🛡️ Protección del Repositorio

### Archivos que NUNCA deben commitearse:

```
.env
.env.local
.env.production
*.key
*.pem
credentials.json
service-account.json
```

### Verificar antes de hacer commit:

```bash
# Revisar qué archivos se van a commitear
git status

# Buscar posibles credenciales expuestas
git diff --cached | grep -i "password\|secret\|key\|token"
```

---

## 📞 Soporte y Emergencias

### Si expones credenciales accidentalmente:

1. **Inmediatamente**: Cambia todas las credenciales expuestas
2. **Supabase**: Rota las API keys en el dashboard
3. **Git**: Usa `git filter-branch` o BFG Repo-Cleaner para eliminar del historial
4. **GitHub**: Reporta el incidente si fue público
5. **Auditoría**: Revisa logs de actividad sospechosa

### Contacto de Emergencia:
- Email de seguridad: security@campersites.pro (configurar en producción)

---

## 🎯 Mejores Prácticas

### Para Desarrolladores:

1. Usa variables de entorno para todo dato sensible
2. Nunca compartas tu archivo `.env`
3. Usa diferentes códigos para desarrollo y producción
4. Implementa validación server-side antes de production
5. Revisa regularmente los logs de auditoría

### Para Administradores:

1. Usa códigos complejos (mínimo 16 caracteres)
2. Combina mayúsculas, minúsculas, números y símbolos
3. No uses palabras del diccionario o fechas comunes
4. Almacena los códigos en un gestor de contraseñas seguro
5. Nunca compartas códigos por email o chat sin cifrar

---

## 📚 Recursos Adicionales

- [OWASP - Gestión de Secretos](https://owasp.org/www-project-cheat-sheet/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/security)
- [React Native Security Guide](https://reactnative.dev/docs/security)

---

**Última actualización:** 2024  
**Versión:** 1.0.0  
**Clasificación:** CONFIDENCIAL
