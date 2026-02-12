# ⚙️ CONFIGURACIÓN

Copia este archivo a `.env` y rellena los valores:

```bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🗺️ MAPBOX (OBLIGATORIO)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MAPBOX_TOKEN=pk.eyJ1Ijoibm9tYnJldXN1YXJpbyIsImEiOiJjbHh4eHh4eHgifQ.xxxxxxxxxxxxxxxxxxxxxxx

# Obtener en: https://account.mapbox.com/
# Plan gratuito: 50,000 vistas/mes

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🔑 API KEYS (OPCIONAL)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Google Maps (para verificación radares)
GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX

# Anthropic (para chat IA - opcional)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🚀 PRODUCCIÓN
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NODE_ENV=development

# Cambiar a production para build:
# NODE_ENV=production
```

---

## 📝 NOTAS

1. **NUNCA** subir `.env` a GitHub
2. Variables con `NEXT_PUBLIC_` son visibles en cliente
3. En producción, configurar en Vercel/Railway/Render
4. Mapbox es **OBLIGATORIO** para que funcione el mapa

---

## 🔗 Enlaces Útiles

- Mapbox: https://account.mapbox.com/
- Google Cloud: https://console.cloud.google.com/
- Anthropic: https://console.anthropic.com/
