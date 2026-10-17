# CamperSites Pro — Estado de datos (honesto)

Última actualización: 2026-10-17

## Regla

El JSON del repo **no** tiene 15.000 campings ni 118.000 sitios ni 2.007 radares.
Se cuenta lo real y se escribe ese número en UI, README y docs.
Origen de verdad: Supabase (cuando esté cargado). Mientras, los archivos en `data/`.

## Conteos actuales (repo)

| Fuente | Tabla / archivo | Conteo real | Notas |
|--------|-----------------|-------------|-------|
| Radares | `data/radares-verificados.json` | **100** | Verificados, activos. Estructura `{ radares: [...], stats, lastUpdated }` |
| Locations | `data/scraped-data.json` | **Pendiente de conteo exacto** | Archivo grande (>1 MB). Ejecutar script local o `node -e` para `COUNT` antes de cargar. |
| Supabase `locations` | tabla | **Por confirmar** | Requiere `SUPABASE_SERVICE_ROLE_KEY` local. Usar `scripts/check-db-status.js` |
| Supabase `radars` | tabla | **Por confirmar** | Idem |

## Qué falta para cerrar bloque A

1. Contar filas exactas de `scraped-data.json` y documentar aquí.
2. Cargar radares (100) + locations reales a Supabase (script limpio, sin inventar filas).
3. Verificar RLS y que el cliente lea de la tabla real (sin mock que finge datos).
4. Actualizar este archivo + UI con los números reales.
5. Quitar o degradar correctamente el mock de `src/lib/supabase.ts` (no debe devolver signIn OK con user null).

## Scripts útiles

- `scripts/check-db-status.js` — conteos en Supabase (necesita `.env` local).
- `scripts/upload-radars.js` / prepare-upload — revisar antes de usar.
- Scrapers: respetar rate limits OSM. No commitear dumps gigantes si no hace falta.

## Próximo paso

Ejecutar conteo local de locations → actualizar esta tabla → cargar a Supabase → PR de limpieza del mock.

Con datos reales vivos, el GPS y las alertas en carretera (bloque B) pueden superar a Waze/Google Maps en el dominio camper: avisos reales, verificación geo, base para agente de IA y estado de la carretera en tiempo real.
