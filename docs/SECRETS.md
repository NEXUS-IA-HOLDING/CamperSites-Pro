# Higiene de secretos — CamperSites Pro

## Regla

Nada de `.env`, `service_role`, keystores de release ni códigos admin en Git.
Solo se versiona `.env.example` (vacío, sin valores reales).

## Setup local

```bash
cp .env.example .env
# edita .env con tus claves de Supabase / Mapbox
```

## Qué se corrigió (rama `security/secrets-hygiene`)

- `.env` deja de trackearse (el contenido actual eran placeholders, no claves vivas).
- `node_modules/` deja de trackearse (~2.000 archivos).
- `.gitignore` reescrito (el anterior empezaba con un fence markdown y no ignoraba `.env`).
- Token de Mapbox embebido en `src/config/AppConfig.ts` eliminado.
- Códigos admin en claro fuera de `.env.example`; hashes vacíos = admin desactivado.
- Salt por defecto quitado del código: sin `ADMIN_SALT` local, admin no funciona.

## Qué no hace este cambio

No reescribe el historial de Git. Un force-push de `filter-repo` es otro paso, coordinado, porque rompe clones y ramas.

## Si alguna vez hubo claves reales en el repo o en un commit

Rótalas **antes** de dar por cerrada la higiene (aunque hoy el `.env` de `main` sea plantilla):

1. Supabase → Project Settings → API → Reset `anon` y `service_role` si existían.
2. Mapbox → Account → Access tokens → revoca tokens viejos.
3. Códigos admin que salieron en mensajes de commit: considéralos quemados. Genera otros y un salt nuevo.
4. No reutilices el salt `YRYS_CAMPER_SITES_2024*` ni códigos de ejemplo.

## Checklist antes de cada commit

```bash
git status
git diff --cached | grep -iE 'password|secret|token|apikey|service_role|BEGIN PRIVATE'
```

Si algo coincide, no hagas commit.
