# Programa de Afiliados - AI Car Assistant

## Visión General
Programa de afiliados diseñado para crecer sin costo inicial, utilizando descuentos en planes y meses gratis como recompensas principales.

## Estructura del Programa

### Niveles de Afiliados
1. **Bronce** (0-5 referidos exitosos)
   - 1 mes gratis por cada referido que contrate plan anual
   - 10% de descuento en renovación mensual

2. **Plata** (6-15 referidos exitosos)
   - 2 meses gratis por cada referido que contrate plan anual
   - 20% de descuento en renovación mensual
   - Acceso anticipado a nuevas características

3. **Oro** (16+ referidos exitosos)
   - 3 meses gratis por cada referido que contrate plan anual
   - 30% de descuento en renovación mensual
   - Acceso anticipado a nuevas características
   - Badge especial en perfil
   - Soporte prioritario

### Definición de "Referido Exitoso"
Un referido se considera exitoso cuando:
- Se registra usando el código/código de afiliado
- Completa el onboarding básico
- Contrata un plan pago (mensual o anual) dentro de los 30 días

## Recompensas Sin Costo Directo

### Para Usuarios Free
- 1 semana de plan Premium por cada 3 referidos que completen onboarding
- Badge de "Early Adopter" en perfil
- Acceso a betas cerradas

### Para Usuarios Premium
- Extensión de suscripción actual (meses gratis)
- Descuentos en renovaciones futuras
- Características exclusivas sin costo adicional de infraestructura

### Recompensas No Monetarias
1. **Reconocimiento Social**
   - Tabla de líderes mensual
   - Badges en perfil
   - Menciones en redes sociales (con permiso)

2. **Acceso Exclusivo**
   - Beta testing de nuevas features
   - Voto en roadmap de producto
   - Webinars exclusivos con el equipo

3. **Beneficios de Comunidad**
   - Grupo privado de Discord/Telegram
   - Contenido educativo premium
   - Plantillas y recursos exclusivos

## Sistema de Tracking

### Códigos de Referido
- Formato: `USER-{ID}-{RANDOM}` (ej: `USER-12345-A7B9`)
- URL personalizada: `https://app.aicarassistant.com/ref/{codigo}`
- QR code generado automáticamente para cada usuario

### Atribución
- Cookie de 30 días para tracking web
- Attribution window de 30 días desde el click
- First-click attribution model
- Prevención de fraude con validación de dispositivo y email único

## Implementación Técnica

### Base de Datos (Supabase)

```sql
-- Tabla de afiliados
CREATE TABLE affiliate_program (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  referral_code TEXT UNIQUE NOT NULL,
  total_referrals INTEGER DEFAULT 0,
  successful_referrals INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'bronze',
  total_earned_months INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de referidos
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES affiliate_program(id),
  referred_user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending', -- pending, converted, expired
  converted_at TIMESTAMP WITH TIME ZONE,
  reward_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de recompensas
CREATE TABLE affiliate_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  reward_type TEXT NOT NULL, -- free_months, discount, badge
  reward_value TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, active, used, expired
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Funciones Automáticas

```typescript
// Calcular tier automáticamente
function calculateTier(successfulReferrals: number): string {
  if (successfulReferrals >= 16) return 'gold';
  if (successfulReferrals >= 6) return 'silver';
  return 'bronze';
}

// Calcular recompensa según tier y tipo de plan
function calculateReward(tier: string, planType: 'monthly' | 'annual'): {
  freeMonths: number;
  discountPercent: number;
} {
  const rewards = {
    bronze: { monthly: { months: 0, discount: 10 }, annual: { months: 1, discount: 0 } },
    silver: { monthly: { months: 0, discount: 20 }, annual: { months: 2, discount: 0 } },
    gold: { monthly: { months: 0, discount: 30 }, annual: { months: 3, discount: 0 } }
  };
  
  return rewards[tier][planType];
}
```

## Flujo de Usuario

### Para el Afiliado
1. Usuario accede a sección "Invita Amigos" en configuración
2. Obtiene su código único y URL personalizada
3. Comparte código/URL por redes sociales, email, WhatsApp, etc.
4. Dashboard muestra:
   - Total de clicks en su enlace
   - Registrados pendientes de conversión
   - Referidos exitosos
   - Recompensas disponibles
   - Progreso al siguiente tier

### Para el Referido
1. Click en enlace de referido o ingresa código manualmente
2. Landing page personalizada con mensaje del afiliado
3. Registro con atribución automática
4. Onboarding normal
5. Al contratar plan, ambas partes reciben notificación de recompensa

## Prevención de Fraude

### Reglas Anti-Fraude
- Máximo 1 cuenta por dispositivo/email/tarjeta
- Período de espera de 14 días antes de liberar recompensas
- Validación de actividad real del referido (no cuentas vacías)
- Límite máximo de 50 referidos exitosos por año por usuario
- Revisión manual para cuentas >10 referidos/mes

### Detección de Patrones Sospechosos
- Múltiples registros desde misma IP/dispositivo
- Cuentas creadas y abandonadas inmediatamente
- Patrones de registro automatizados
- Uso de emails temporales/desechables

## Comunicación y Marketing

### Email Templates
1. **Bienvenida al Programa**: Explicación de beneficios y cómo empezar
2. **Nuevo Referido Registrado**: Notificación cuando alguien usa su código
3. **Referido Convertido**: Celebración y detalles de recompensa ganada
4. **Actualización de Tier**: Felicitación por alcanzar nuevo nivel
5. **Recordatorio Mensual**: Resumen de progreso y recompensas disponibles

### In-App Messages
- Banner promocional en dashboard
- Notificación push cuando se gana recompensa
- Progress bar hacia siguiente tier
- Testimonios de afiliados exitosos

### Recursos para Afiliados
- Kit de marketing descargable (imágenes, textos, videos cortos)
- Guía de mejores prácticas
- FAQ del programa
- Casos de éxito mensuales

## Métricas de Éxito

### KPIs a Monitorear
- Tasa de conversión de referidos (%)
- CAC (Customer Acquisition Cost) reducido
- LTV de clientes adquiridos por afiliados
- Retención de afiliados activos
- ROI del programa (debería ser positivo desde el inicio)

### Objetivos Primeros 6 Meses
- 20% de nuevos usuarios vía afiliados
- 15% de usuarios activos en el programa
- CAC 40% menor que canales tradicionales
- NPS de afiliados > 50

## Lanzamiento por Fases

### Fase 1 (Mes 1): Beta Cerrada
- Invitar a 100 usuarios más activos
- Recopilar feedback y ajustar
- Documentar casos de éxito

### Fase 2 (Mes 2-3): Lanzamiento Controlado
- Abrir a todos los usuarios premium
- Campaña de email marketing
- Ajustar tasas según datos reales

### Fase 3 (Mes 4+): Escalamiento
- Abrir a todos los usuarios (incluidos free con límites)
- Campañas estacionales (bonus por tiempo limitado)
- Programa de embajadores para top affiliates

## Consideraciones Legales

### Términos y Condiciones
- Clarificar que recompensas son créditos en la plataforma, no dinero
- Establecer que la empresa puede modificar términos con 30 días de aviso
- Definir políticas de terminación por fraude
- Incluir cláusula de cumplimiento de leyes locales

### Privacidad
- Los afiliados solo ven métricas agregadas de sus referidos
- No se comparten datos personales entre afiliado y referido
- Cumplimiento GDPR/CCPA en tracking

## Presupuesto Estimado

### Costos Directos: $0 iniciales
- Las recompensas son descuentos futuros o extensión de servicio
- El costo marginal de usuarios adicionales es cercano a cero
- Solo se incurre en costo cuando el referido paga primero

### Costos Indirectos
- Desarrollo inicial: 40-60 horas de ingeniería
- Diseño de assets: 10-15 horas
- Gestión continua: 5-10 horas/semana (automatizable)

### ROI Esperado
- Break-even: Inmediato (sin costos upfront)
- Mes 3: 15-20% de adquisición orgánica
- Mes 6: 25-30% de adquisición orgánica
- LTV/CAC ratio: >8:1 (vs 3:1 en paid ads)

## Próximos Pasos

1. **Semana 1**: Implementación técnica (tablas DB, funciones, API)
2. **Semana 2**: UI/UX (dashboard, códigos QR, tracking)
3. **Semana 3**: Sistema de notificaciones y emails
4. **Semana 4**: Beta testing con usuarios seleccionados
5. **Semana 5**: Lanzamiento oficial + campaña de marketing

---

**Nota**: Este programa está diseñado específicamente para ser "cash-flow positive" desde el día 1, ya que solo otorga recompensas después de que el referido ha generado ingresos, y las recompensas son en forma de descuentos futuros o extensión de servicio con costo marginal cercano a cero.
