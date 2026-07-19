# 🔐 Sistema de Activación de Administrador - CamperSites Pro

## Descripción General

Sistema seguro para activar modo administrador mediante códigos secretos, permitiendo probar todas las funcionalidades premium y configuraciones de la aplicación.

---

## 🎯 Características Principales

### Seguridad Implementada
- ✅ **Códigos hasheados** (no almacenados en texto plano)
- ✅ **Rate limiting estricto** (3 intentos por hora)
- ✅ **Expiración automática** (24 horas por defecto)
- ✅ **Device fingerprinting** (vinculado al dispositivo)
- ✅ **Logging de auditoría** completo
- ✅ **Validación server-side** opcional para producción

### Niveles de Acceso
| Nivel | Código | Permisos |
|-------|--------|----------|
| **Master** | `ADMIN2024YRYS` | Acceso total completo |
| **Test** | `TESTADMIN2024` | Testing de funcionalidades |
| **Support** | `SUPPORT2024` | Solo lectura y analytics |

---

## 📦 Archivos Creados

### 1. `/src/lib/adminAuth.ts`
Servicio principal con todas las funciones de autenticación admin:

```typescript
// Funciones principales exportadas
- validateAdminCode(code: string)        // Validar código
- activateAdminMode(level)               // Activar sesión
- isAdminActive()                        // Verificar estado
- deactivateAdminMode()                  // Cerrar sesión
- getAdminSessionInfo()                  // Info detallada
- getAdminPermissions(level)             // Permisos por nivel
```

### 2. `/src/components/AdminActivationPanel.tsx`
Componente UI para activación desde la app:
- Modal de ingreso de código
- Panel visual cuando está activo
- Botón de desactivación
- Mostrar tiempo restante y permisos

### 3. Integración en ProfileScreen
El componente se ha integrado automáticamente en la pantalla de perfil.

---

## 🚀 Cómo Usar

### Método 1: Desde la Interfaz (Recomendado)

1. Abre la app y ve a **Perfil**
2. Busca el botón **"Activar Modo Admin"**
3. Ingresa uno de los códigos:
   - `ADMIN2024YRYS` → Nivel Master
   - `TESTADMIN2024` → Nivel Test
   - `SUPPORT2024` → Nivel Support
4. ¡Listo! Tienes 24h de acceso completo

### Método 2: Programáticamente

```typescript
import { 
  validateAdminCode, 
  activateAdminMode, 
  isAdminActive 
} from './src/lib/adminAuth';

// En tu componente o función
const handleActivate = async () => {
  const result = await validateAdminCode('ADMIN2024YRYS');
  
  if (result.valid && result.adminLevel) {
    const activation = await activateAdminMode(result.adminLevel);
    
    if (activation.success) {
      console.log('✅ Modo Admin Activado');
    }
  }
};
```

### Verificar Estado Admin

```typescript
const status = await isAdminActive();

if (status.active) {
  console.log(`Nivel: ${status.level}`);
  console.log(`Expira en: ${status.timeRemaining}ms`);
  console.log(`Expira pronto: ${status.expiresSoon}`);
}
```

---

## 🔒 Medidas de Seguridad

### 1. Rate Limiting
```typescript
// Máximo 3 intentos por hora
'admin_activation': { maxPerWindow: 3, windowMs: 3600000 }
```

Si se excede el límite:
```
"Demasiados intentos. Espera 60 minutos."
```

### 2. Device Fingerprinting
La sesión admin está vinculada al dispositivo específico donde se activó. Si intentas usar la misma sesión en otro dispositivo, será invalidada automáticamente.

### 3. Expiración Automática
- Duración predeterminada: **24 horas**
- Notificación de expiración próxima: **2 horas antes**
- Limpieza automática al expirar

### 4. Hash de Códigos
Los códigos no se comparan en texto plano:
```typescript
// El código se hashea antes de comparar
const providedHash = hashAdminCode(cleanCode);
```

### 5. Auditoría Completa
Todos los eventos se registran:
- Intentos exitosos/fallidos
- Activaciones
- Desactivaciones (manuales y automáticas)
- Cambios de dispositivo

---

## 🛠️ Funciones de Desarrollo

### Resetear Intentos (Solo DEV)
```typescript
import { resetAdminAttempts } from './src/lib/adminAuth';

await resetAdminAttempts(); // Limpia el rate limit
```

### Forzar Expiración (Solo DEV)
```typescript
import { forceAdminExpiration } from './src/lib/adminAuth';

await forceAdminExpiration(); // Expira la sesión actual
```

---

## 📊 Permisos por Nivel

### Nivel Master (`ADMIN2024YRYS`)
```typescript
{
  canAccessAllPlans: true,      // Ver todos los planes premium
  canModifySettings: true,       // Modificar configuración global
  canViewAnalytics: true,        // Ver analytics de usuarios
  canManageUsers: true,          // Gestionar usuarios
  canBypassLimits: true,         // Omitir rate limits
  canAccessDebugTools: true,     // Herramientas de debug
}
```

### Nivel Test (`TESTADMIN2024`)
```typescript
{
  canAccessAllPlans: true,      // ✅
  canModifySettings: true,       // ✅
  canViewAnalytics: false,       // ❌
  canManageUsers: false,         // ❌
  canBypassLimits: true,         // ✅
  canAccessDebugTools: true,     // ✅
}
```

### Nivel Support (`SUPPORT2024`)
```typescript
{
  canAccessAllPlans: false,      // ❌
  canModifySettings: false,      // ❌
  canViewAnalytics: true,        // ✅ Solo lectura
  canManageUsers: false,         // ❌
  canBypassLimits: false,        // ❌
  canAccessDebugTools: false,    // ❌
}
```

---

## 🔄 Flujo de Activación

```
┌─────────────────────────────────────────────────────┐
│  1. Usuario ingresa código en el modal              │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  2. checkRateLimit('admin_activation')              │
│     ¿Excedió 3 intentos/hora? → BLOQUEADO           │
└──────────────────┬──────────────────────────────────┘
                   │ OK
                   ▼
┌─────────────────────────────────────────────────────┐
│  3. hashAdminCode(código) → comparar con hashes     │
│     ¿Coincide? → NO → Registrar intento fallido     │
└──────────────────┬──────────────────────────────────┘
                   │ SÍ
                   ▼
┌─────────────────────────────────────────────────────┐
│  4. activateAdminMode(nivel)                        │
│     - Generar session ID                            │
│     - Guardar en AsyncStorage                       │
│     - Log de auditoría                              │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  5. UI actualiza → Muestra panel admin activo       │
│     - Nivel, permisos, tiempo restante              │
└─────────────────────────────────────────────────────┘
```

---

## 🏗️ Integración en Producción

Para producción, se recomienda validar códigos contra la base de datos:

### 1. Crear tabla en Supabase
```sql
CREATE TABLE admin_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_hash TEXT NOT NULL UNIQUE,
  level TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_admin_codes_active ON admin_codes(is_active) WHERE is_active = true;
```

### 2. Usar validación server-side
```typescript
import { validateAdminCodeServerSide } from './src/lib/adminAuth';

const result = await validateAdminCodeServerSide(code);
```

### 3. Configurar RLS (Row Level Security)
```sql
ALTER TABLE admin_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo admins pueden leer"
  ON admin_codes FOR SELECT
  USING (auth.jwt()->>'role' = 'admin');
```

---

## 🧪 Testing

### Casos de Prueba

```typescript
// 1. Código válido
const result = await validateAdminCode('ADMIN2024YRYS');
expect(result.valid).toBe(true);
expect(result.adminLevel).toBe('master');

// 2. Código inválido
const invalid = await validateAdminCode('CODIGO_INCORRECTO');
expect(invalid.valid).toBe(false);

// 3. Rate limiting
for (let i = 0; i < 4; i++) {
  await validateAdminCode('WRONG_CODE');
}
// El cuarto intento debería fallar por rate limit

// 4. Sesión activa
await activateAdminMode('test');
const status = await isAdminActive();
expect(status.active).toBe(true);
expect(status.level).toBe('test');

// 5. Expiración
await forceAdminExpiration();
const expired = await isAdminActive();
expect(expired.active).toBe(false);
```

---

## 📝 Logs de Auditoría

Todos los eventos se registran en la tabla `audit_log`:

```typescript
// Ejemplos de eventos logged
'admin_code_success'    // Código correcto
'admin_code_failed'     // Código incorrecto
'admin_activated'       // Sesión iniciada
'admin_deactivated'     // Sesión cerrada
```

Cada log incluye:
- `user_id` (si está autenticado)
- `action` (tipo de evento)
- `details` (metadata: fingerprint, plataforma, etc.)
- `timestamp` (automático)

---

## ⚠️ Consideraciones Importantes

### Para Desarrollo
- ✅ Los códigos funcionan offline
- ✅ No requiere conexión a internet
- ✅ Ideal para testing local

### Para Producción
- ⚠️ Cambiar a validación server-side
- ⚠️ Rotar códigos periódicamente
- ⚠️ Implementar revocación remota
- ⚠️ Monitorear logs de auditoría
- ⚠️ No exponer códigos en el cliente

### Migración a Producción
```typescript
// En desarrollo usa:
validateAdminCode(code)

// En producción cambia a:
if (__DEV__) {
  return validateAdminCode(code);
} else {
  return validateAdminCodeServerSide(code);
}
```

---

## 🎨 Personalización UI

El componente `AdminActivationPanel` es completamente personalizable:

```typescript
// Colores por nivel
const colors = {
  master: '#FFD700',  // Dorado
  test: '#PRIMARY',   // Color primario del tema
  support: '#GRAY',   // Gris
};

// Iconos por nivel
const icons = {
  master: 'crown',
  test: 'bug',
  support: 'headset',
};
```

---

## 📞 Soporte

Para problemas o preguntas:
1. Revisar logs en consola
2. Verificar tabla `audit_log` en Supabase
3. Comprobar rate limiting con `getRateLimitReset('admin_activation')`
4. Resetear intentos en modo desarrollo

---

**Versión:** 1.0.0  
**Última actualización:** 2024  
**Autor:** YRYS CamperSites Pro Team
