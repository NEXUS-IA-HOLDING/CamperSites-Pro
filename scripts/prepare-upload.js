#!/usr/bin/env node
/**
 * Prepara los datos parciales del scraper para subir a Supabase.
 * Lee scraped-data-partial.json, deduplica y guarda como scraped-data.json
 */
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const partialFile = path.join(dataDir, 'scraped-data-partial.json');
const outputFile = path.join(dataDir, 'scraped-data.json');

console.log('Leyendo datos parciales...');
const partial = JSON.parse(fs.readFileSync(partialFile, 'utf-8'));
const locs = partial.locations || [];
console.log(`  Total sin deduplicar: ${locs.length}`);

// Deduplicar por ID
const seen = new Map();
locs.forEach(l => {
  if (!seen.has(l.id)) seen.set(l.id, l);
});
const unique = Array.from(seen.values());
console.log(`  Únicas: ${unique.length} (${locs.length - unique.length} duplicados eliminados)`);

// Stats
const byCat = {};
const byCountry = {};
unique.forEach(l => {
  byCat[l.category] = (byCat[l.category] || 0) + 1;
  byCountry[l.country] = (byCountry[l.country] || 0) + 1;
});

// Guardar
fs.writeFileSync(outputFile, JSON.stringify({
  locations: unique,
  stats: { total: unique.length, byCategory: byCat, byCountry },
  lastUpdated: new Date().toISOString(),
  version: '3.0-partial',
}, null, 2));

console.log('\nPOR CATEGORÍA:');
Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([c, n]) =>
  console.log(`  ${c.padEnd(22)} ${String(n).padStart(6)}`)
);

console.log('\nPOR PAÍS:');
Object.entries(byCountry).sort((a, b) => b[1] - a[1]).forEach(([c, n]) =>
  console.log(`  ${c.padEnd(10)} ${String(n).padStart(6)}`)
);

console.log(`\n✅ Guardado en ${outputFile} (${(fs.statSync(outputFile).size / 1024 / 1024).toFixed(1)}MB)`);
console.log('Ahora ejecuta: node scripts/setup-database.js');
