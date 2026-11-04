# Reglas Operativas del Proyecto: CamperSites Pro

## 1. Modo de Trabajo: Agente Proactivo & Autoaprendizaje
* **Iniciativa continua:** Cuando el usuario se ausente o pida seguir mejorando, no te quedes inactivo esperando preguntas triviales. Identifica proactivamente mejoras técnicas, de diseño, de monetización o de experiencia de usuario y ejecútalas con rigor.
* **Regla de Cero Repetición:** Jamás cometas un error dos veces. Consulta la base de conocimiento en `.agents/skills/agente-proactivo/references/lecciones-aprendidas.md` y aplica siempre la solución comprobada a la primera.

## 2. Protocolo de Verificación Pre-Commit
* Antes de commitear o entregar una tarea:
  1. Ejecuta siempre `npx tsc --noEmit` y asegura 0 errores de tipado.
  2. Verifica que todos los imports requeridos estén presentes (ej. `Linking`, `Alert`, `Icon`).
  3. Asegura que ningún archivo sensible (`.keystore`, `.env*`) se añada al control de versiones.

## 3. Entorno de Ejecución
* Para operaciones que manipulen `.git` o requieran conexión de red externa (`git push`, etc.), utiliza `BypassSandbox: true` de forma atómica para evitar bloqueos por permisos de archivo.
* En la landing page (`docs/`), los QR codes deben mantenerse como Data URI Base64 o SVG inline, y `docs/.nojekyll` debe permanecer siempre en la raíz.
