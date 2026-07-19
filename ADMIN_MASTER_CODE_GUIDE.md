# 🔐 Sistema de Activación de Administrador y Códigos de Referido

## 📋 Resumen

Este documento explica cómo usar el **código maestro de administrador** y el **sistema de códigos de referido** implementados en CamperSites Pro.

---

## 🎯 Código Maestro de Administrador

### ¿Qué es?

Un código especial que, al ser ingresado durante el registro, otorga **acceso completo premium** a todas las funcionalidades de la aplicación.

### 🔑 Código Maestro

```
Ypgev*6BR7KjfxNZaXZA&Mh*f%D$AhBG@$w^hT1reETy^5MxvrwQzAF1^Vq2cM8E
```

### ⚡ Cómo Usar el Código Maestro

1. **Abre la aplicación** CamperSites Pro
2. **Selecciona "Registrarse"** en la pantalla de autenticación
3. **Completa el formulario**:
   - Nombre de viajero
   - Email
   - Contraseña
4. **Ingresa el código maestro** en el campo "Código de Referido (opcional)"
5. **Haz clic en "Crear cuenta"**

### ✅ Beneficios del Código Maestro

- **Plan Premium automático**: Tu cuenta se crea directamente con plan 'premium'
- **Acceso total inmediato**: Todas las funcionalidades desbloqueadas
- **Sesión admin activada**: 24 horas de modo administrador
- **Permisos completos**:
  - ✅ Acceso a todos los planes
  - ✅ Modificación de configuraciones
  - ✅ Ver analytics
  - ✅ Gestión de usuarios
  - ✅ Bypass de límites
  - ✅ Herramientas de debug

### 🔒 Seguridad Implementada

- **Validación directa**: El código se verifica sin hash para máxima precisión
- **Rate limiting**: Máximo 3 intentos por hora
- **Logging de auditoría**: Todos los accesos quedan registrados
- **Device fingerprinting**: Vinculado al dispositivo específico
- **Expiración automática**: La sesión admin expira en 24 horas

---

## 👥 Sistema de Códigos de Referido

### ¿Cómo funciona?

Durante el registro, los usuarios pueden ingresar un **código de referido** opcional que les permite:

1. **Usuarios normales**: Ingresar códigos de amigos para futuros beneficios del programa de afiliados
2. **Administradores**: Ingresar el código maestro para acceso completo

### Campos Guardados en el Registro

Cuando un usuario se registra, se almacenan los siguientes datos:

```typescript
{
  display_name: "Nombre del usuario",
  referral_code: "Código ingresado (si hay)",
  is_admin: true/false, // true solo si usa el código maestro
  plan: "premium" | "free" // premium si es admin, free si no
}
```

### Flujo de Registro

#### Usuario Normal (sin código o con código de amigo)
```
1. Ingresa nombre, email, contraseña
2. (Opcional) Ingresa código de referido de amigo
3. Se crea cuenta con plan 'free'
4. is_admin = false
5. Recibe email de confirmación
```

#### Administrador (con código maestro)
```
1. Ingresa nombre, email, contraseña
2. Ingresa código maestro: Ypgev*6BR7...
3. Se crea cuenta con plan 'premium'
4. is_admin = true
5. Sesión admin activada automáticamente
6. Recibe email de confirmación + alerta de acceso completo
```

---

## 🛠️ Integración Técnica

### Archivos Modificados

1. **`src/screens/AuthScreen.tsx`**
   - Campo de código de referido en formulario de registro
   - Validación del código maestro
   - Activación automática de sesión admin
   - Mensajes diferenciados según tipo de cuenta

2. **`src/lib/adminAuth.ts`**
   - Función `activateAdminByCode()` exportada
   - Validación directa del código maestro
   - Soporte para múltiples niveles de admin

### Funciones Clave

```typescript
// Importar en cualquier componente
import { activateAdminByCode, isAdminActive, getAdminPermissions } from './src/lib/adminAuth';

// Activar admin con código
const result = await activateAdminByCode('Ypgev*6BR7KjfxNZaXZA&Mh*f%D$AhBG@$w^hT1reETy^5MxvrwQzAF1^Vq2cM8E');

if (result.success) {
  console.log('Modo admin activado:', result.session?.level);
}

// Verificar si admin está activo
const status = await isAdminActive();
if (status.active) {
  console.log('Nivel:', status.level);
  console.log('Tiempo restante:', status.timeRemaining);
}

// Obtener permisos
if (status.active && status.level) {
  const perms = getAdminPermissions(status.level);
  if (perms.canAccessAllPlans) {
    // Mostrar features premium
  }
}
```

---

## 📊 Niveles de Administrador

| Nivel | Código | Permisos | Duración |
|-------|--------|----------|----------|
| **Master** | `Ypgev*6BR7KjfxNZaXZA&Mh*f%D$AhBG@$w^hT1reETy^5MxvrwQzAF1^Vq2cM8E` | Todos | 24h |
| Master (alt) | `ADMIN2024YRYS` | Todos | 24h |
| Test | `TESTADMIN2024` | Testing completo | 24h |
| Support | `SUPPORT2024` | Solo lectura | 24h |

### Permisos por Nivel

| Permiso | Master | Test | Support |
|---------|--------|------|---------|
| Acceso a todos los planes | ✅ | ✅ | ❌ |
| Modificar settings | ✅ | ✅ | ❌ |
| Ver analytics | ✅ | ❌ | ✅ |
| Gestionar usuarios | ✅ | ❌ | ❌ |
| Bypass de límites | ✅ | ✅ | ❌ |
| Herramientas debug | ✅ | ✅ | ❌ |

---

## 🧪 Testing y Desarrollo

### Probar Todas las Funcionalidades

Como administrador, puedes:

1. **Explorar todos los planes**: Accede a features premium sin restricciones
2. **Modificar configuraciones**: Prueba cambios en tiempo real
3. **Ver analytics**: Analiza datos de uso y rendimiento
4. **Gestionar usuarios**: Simula operaciones de administración
5. **Bypassear límites**: Ignora rate limits y quotas para testing
6. **Usar debug tools**: Accede a herramientas de desarrollo

### Resetear Sesión Admin (Solo DEV)

```typescript
import { resetAdminAttempts, forceAdminExpiration } from './src/lib/adminAuth';

// Resetear intentos fallidos
await resetAdminAttempts();

// Forzar expiración de sesión
await forceAdminExpiration();
```

---

## 🔐 Consideraciones de Seguridad

### Para Producción

⚠️ **Importante**: Antes de llevar a producción:

1. **Mover validación a server-side**: Usar Supabase Edge Functions o RPC
2. **Almacenar códigos en DB**: Tabla `admin_codes` con hashes bcrypt
3. **Implementar MFA**: Para activaciones de nivel master
4. **Auditoría reforzada**: Logs inmutables en servicio externo
5. **Rotación de códigos**: Cambiar códigos periódicamente

### Protección Actual

- ✅ Rate limiting (3 intentos/hora)
- ✅ Device fingerprinting
- ✅ Logging de auditoría
- ✅ Expiración automática (24h)
- ✅ Ofuscación de códigos en logs
- ✅ Validación de longitud mínima (8 caracteres)

---

## 📝 Ejemplo de Uso en la App

### Pantalla de Registro (AuthScreen.tsx)

```tsx
// Estado para código de referido
const [referralCode, setReferralCode] = useState('');

// En handleRegister()
const MASTER_ADMIN_CODE = 'Ypgev*6BR7KjfxNZaXZA&Mh*f%D$AhBG@$w^hT1reETy^5MxvrwQzAF1^Vq2cM8E';
let isAdmin = false;

if (referralCode.trim() === MASTER_ADMIN_CODE) {
  isAdmin = true;
}

// Crear cuenta con metadata
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      display_name: displayName,
      referral_code: referralCode.trim(),
      is_admin: isAdmin,
      plan: isAdmin ? 'premium' : 'free',
    },
  },
});

// Si es admin, activar sesión
if (isAdmin) {
  await activateAdminByCode(MASTER_ADMIN_CODE);
  Alert.alert('¡Cuenta de Administrador Creada!', 
    'Tienes acceso completo a todas las funcionalidades.');
}
```

---

## 🎁 Programa de Afiliados (Futuro)

El campo de código de referido está preparado para el **programa de afiliados**:

- Los usuarios podrán generar sus propios códigos únicos
- Cada referido exitoso dará puntos/beneficios
- Niveles: Bronce, Plata, Oro
- Recompensas: meses gratis, descuentos en planes anuales

### Estructura Preparada

```typescript
// En perfil de usuario
{
  id: 'user_123',
  my_referral_code: 'JUAN2024XYZ',
  referred_users: ['user_456', 'user_789'],
  affiliate_level: 'bronze',
  affiliate_points: 150,
}
```

---

## 📞 Soporte

Si tienes problemas con la activación:

1. Verifica que el código sea exacto (distingue mayúsculas/minúsculas y símbolos)
2. Asegúrate de tener conexión a internet
3. Revisa los logs de la consola para errores específicos
4. Intenta resetear intentos con `resetAdminAttempts()` (solo DEV)

---

**Última actualización**: 2024
**Versión**: 1.0.0
**Autor**: CamperSites Pro Team - YRYS
