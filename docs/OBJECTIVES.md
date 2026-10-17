# CamperSites Pro — Objetivos MVP (beta interna)

Estado: **LOCKED** — 2026-09-07 (actualizado 2026-10-17)

Norte: la app de GPS más avanzada para campers. Abre en carretera, ve sitios reales, navega sin salir, recibe avisos de radares/controles/peligros en tiempo real. Base para agente de IA y estado vivo de la carretera. Deja atrás a Google Maps y Waze en el dominio camper.

## Tres decisiones (cerradas)

### 1. Mercado del MVP
**España primero.**
Concentramos datos, scrapers, radares DGT y testers en España. Europa se abre cuando el núcleo (mapa + datos reales + alertas) ya ruede sin mentiras.

### 2. Modelo de monetización
**Freemium limpio.**

| Capa | Incluye | Pago |
|------|---------|------|
| **Gratis** | Mapa + GPS, sitios reales cercanos, navegación básica, favoritos limitados (~10), alertas de radares con límite suave | Nada |
| **Premium (CamperSites Pro)** | Todo ilimitado + offline completo España + filtros avanzados + alertas ilimitadas + sin publicidad + sync favoritos + futuras rutas | ~19,99–29,99 €/año (punto de partida 24,99 €). Mensual más caro. Prueba 7 días. |

- Diseño de gates y pantallas **ahora**.
- Integración de pago real (RevenueCat / Stripe / Play Billing) **después** de que el MVP ruede con testers.
- No anuncios agresivos en carretera.

### 3. Siguiente bloque técnico
**A — Datos reales en Supabase.**

Orden:
1. A → Datos reales + schema limpio + conteos honestos + RLS
2. B → GPS + alertas de verdad en carretera
3. C → Auth real sin mock (en paralelo o justo después)

## En el MVP / fuera

**En:** mapa GPS, sitios reales (los que haya), auth Supabase real, favoritos, alertas que disparan, APK interno para testers.

**Fuera hasta que el MVP ruede:** IAP/Stripe, “15.000 ubicaciones”, planificador multi-día, afiliados, IA de rutas completa, admin backdoor en el cliente, App Store/Play producción.

## Cómo entregar

Rama corta → PR a `main` → CI verde. Un cambio = un objetivo. Cifras honestas siempre.
