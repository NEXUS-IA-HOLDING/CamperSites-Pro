#!/usr/bin/env bash
# deploy-tiktok-verification.sh
# Actualiza instantáneamente el código de verificación de TikTok en ambos repositorios:
# 1. CamperSites-Pro (subruta /CamperSites-Pro/)
# 2. nexus-ia-holding.github.io (dominio raíz)

set -e

CODE="$1"
if [ -z "$CODE" ]; then
  echo "Uso: ./scripts/deploy-tiktok-verification.sh <CODIGO_TIKTOK>"
  echo "Ejemplo: ./scripts/deploy-tiktok-verification.sh fVBSFOCq0sieKsCssUtbJf9WSeA8GXpC"
  exit 1
fi

# Limpiar por si el usuario pasa el nombre completo del archivo
CODE=$(echo "$CODE" | sed 's/tiktok-developers-site-verification=//g' | sed 's/\.txt//g' | sed 's/\.html//g' | tr -d ' ')

echo "🚀 Desplegando nuevo código de TikTok: $CODE"

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="$REPO_DIR/docs"

# 1. Crear variantes en docs/
echo "tiktok-developers-site-verification=$CODE" > "$DOCS_DIR/tiktok-developers-site-verification=$CODE"
echo "tiktok-developers-site-verification=$CODE" > "$DOCS_DIR/tiktok-developers-site-verification=$CODE.txt"
cat <<EOF > "$DOCS_DIR/tiktok-developers-site-verification=$CODE.html"
<!DOCTYPE html>
<html>
<head><meta name="tiktok-developers-site-verification" content="$CODE"></head>
<body>tiktok-developers-site-verification=$CODE</body>
</html>
EOF

echo "tiktok-developers-site-verification=$CODE" > "$DOCS_DIR/tiktok-developers-site-verification.txt"
cat <<EOF > "$DOCS_DIR/tiktok-developers-site-verification.html"
<!DOCTYPE html>
<html>
<head><meta name="tiktok-developers-site-verification" content="$CODE"></head>
<body>tiktok-developers-site-verification=$CODE</body>
</html>
EOF

echo "tiktok-developers-site-verification=$CODE" > "$DOCS_DIR/$CODE.txt"
cat <<EOF > "$DOCS_DIR/$CODE.html"
<!DOCTYPE html>
<html>
<head><meta name="tiktok-developers-site-verification" content="$CODE"></head>
<body>tiktok-developers-site-verification=$CODE</body>
</html>
EOF

# Actualizar meta tag en index.html, privacy.html y terms.html
for f in "$DOCS_DIR/index.html" "$DOCS_DIR/privacy.html" "$DOCS_DIR/terms.html"; do
  if [ -f "$f" ]; then
    sed -i '' "s/content=\"tiktok-developers-site-verification=[^\"]*\"/content=\"$CODE\"/g" "$f" 2>/dev/null || true
    sed -i '' "s/name=\"tiktok-developers-site-verification\" content=\"[^\"]*\"/name=\"tiktok-developers-site-verification\" content=\"$CODE\"/g" "$f" 2>/dev/null || true
  fi
done

# 2. Commit y push en CamperSites-Pro
cd "$REPO_DIR"
git add docs/
git commit -m "fix(tiktok): update verification token to $CODE" || echo "No changes in CamperSites-Pro"
git push origin main || echo "Push warning in CamperSites-Pro"

# 3. Actualizar dominio raíz nexus-ia-holding.github.io
TEMP_ROOT="/tmp/nexus-root-update"
rm -rf "$TEMP_ROOT"
mkdir -p "$TEMP_ROOT"
cd "$TEMP_ROOT"
git clone --depth 1 https://github.com/NEXUS-IA-HOLDING/nexus-ia-holding.github.io.git .

echo "tiktok-developers-site-verification=$CODE" > "tiktok-developers-site-verification=$CODE"
echo "tiktok-developers-site-verification=$CODE" > "tiktok-developers-site-verification=$CODE.txt"
cat <<EOF > "tiktok-developers-site-verification=$CODE.html"
<!DOCTYPE html>
<html>
<head><meta name="tiktok-developers-site-verification" content="$CODE"></head>
<body>tiktok-developers-site-verification=$CODE</body>
</html>
EOF
echo "tiktok-developers-site-verification=$CODE" > "tiktok-developers-site-verification.txt"
echo "tiktok-developers-site-verification=$CODE" > "$CODE.txt"

for f in index.html privacy.html terms.html; do
  if [ -f "$f" ]; then
    sed -i '' "s/content=\"tiktok-developers-site-verification=[^\"]*\"/content=\"$CODE\"/g" "$f" 2>/dev/null || true
    sed -i '' "s/name=\"tiktok-developers-site-verification\" content=\"[^\"]*\"/name=\"tiktok-developers-site-verification\" content=\"$CODE\"/g" "$f" 2>/dev/null || true
  fi
done

git add -A
git commit -m "fix(tiktok): update verification token to $CODE" || echo "No changes in root repo"
git push origin main || echo "Push warning in root repo"

rm -rf "$TEMP_ROOT"
echo "✅ Despliegue completado con éxito para el token $CODE en ambos dominios."
