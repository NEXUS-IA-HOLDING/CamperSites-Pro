# ⚡ INICIO RÁPIDO - 5 MINUTOS

## 1️⃣ INSTALAR (2 min)

```bash
cd CamperSites-Pro-DEFINITIVO
npm install
```

**iOS (solo Mac):**
```bash
cd ios && pod install && cd ..
```

---

## 2️⃣ CONFIGURAR MAPBOX (1 min)

1. Ir a: https://account.mapbox.com/
2. Crear cuenta gratis
3. Copiar "Default public token"
4. Pegar en `src/screens/MapScreen.tsx` línea 380

```typescript
const MAPBOX_TOKEN = 'pk.eyJ1Ijoibm9tYnJldXN1YXJpbyIsImEiOiJjbHh4eHh4eHgifQ.xxx';
```

---

## 3️⃣ EJECUTAR (1 min)

```bash
# Android
npm run android

# iOS
npm run ios
```

---

## 4️⃣ DATOS REALES (1 min)

```bash
npm run scrape
```

Descarga 15,000+ ubicaciones de OpenStreetMap.

---

## ✅ LISTO

La app está corriendo con:
- ✅ GPS tiempo real
- ✅ Alertas 10km
- ✅ Navegación integrada
- ✅ 15,000+ ubicaciones

---

## 🚀 SIGUIENTE

Leer `docs/PASOS_6_7_8_FINALES.md` para:
- Testing en carretera
- Screenshots para stores
- Publicación Google Play + App Store

---

**¿Problemas?** Revisar `README.md` completo
