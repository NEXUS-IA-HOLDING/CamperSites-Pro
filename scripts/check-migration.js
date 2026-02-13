#!/usr/bin/env node

/**
 * check-migration.js
 * ------------------
 * Checks whether migration-003-expanded-categories.sql has been applied
 * to the Supabase database by probing for:
 *   1. The 'country' column on the locations table
 *   2. The expanded CHECK constraint (category 'MIRADOR' allowed)
 */

const SUPABASE_URL = 'https://cdlhipiukgjmfimhjlkl.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkbGhpcGl1a2dqbWZpbWhqbGtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDgyNjIwNywiZXhwIjoyMDg2NDAyMjA3fQ._zi1YHP-A1e_7VNxAi9yRrPZgxxMdVn6YcwkoGoXIFc';

const headers = {
  'apikey':        SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type':  'application/json',
};

async function main() {
  let countryExists = false;
  let expandedCategories = false;

  // ── Test 1: Does the 'country' column exist? ──────────────────────
  console.log('[1/2] Checking if "country" column exists on locations...');
  try {
    const r1 = await fetch(
      `${SUPABASE_URL}/rest/v1/locations?select=country&limit=1`,
      { headers }
    );
    if (r1.ok) {
      countryExists = true;
      console.log('       -> country column EXISTS');
    } else {
      const err = await r1.json();
      console.log('       -> country column MISSING');
      console.log('          Detail:', err.message || JSON.stringify(err));
    }
  } catch (e) {
    console.log('       -> Network error:', e.message);
  }

  // ── Test 2: Is the expanded CHECK constraint in place? ────────────
  console.log('[2/2] Checking if expanded category constraint allows MIRADOR...');
  const testId = `__migration_check_${Date.now()}`;
  const testRow = {
    id:        testId,
    name:      'Migration Check (temporary)',
    latitude:  40.0,
    longitude: -3.0,
    category:  'MIRADOR',
  };

  try {
    const r2 = await fetch(`${SUPABASE_URL}/rest/v1/locations`, {
      method:  'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body:    JSON.stringify(testRow),
    });

    if (r2.ok) {
      expandedCategories = true;
      console.log('       -> MIRADOR category ALLOWED (expanded constraint is active)');

      // Clean up test row
      const del = await fetch(
        `${SUPABASE_URL}/rest/v1/locations?id=eq.${testId}`,
        { method: 'DELETE', headers }
      );
      if (del.ok) {
        console.log('       -> Test row cleaned up');
      } else {
        console.log('       -> WARNING: could not delete test row', testId);
      }
    } else {
      const err = await r2.json();
      if (err.message && err.message.includes('category_check')) {
        console.log('       -> MIRADOR category NOT ALLOWED (old constraint still in place)');
      } else {
        console.log('       -> Insert failed for another reason:', err.message || JSON.stringify(err));
      }
    }
  } catch (e) {
    console.log('       -> Network error:', e.message);
  }

  // ── Summary ───────────────────────────────────────────────────────
  console.log('\n========================================');
  console.log('  MIGRATION 003 STATUS');
  console.log('========================================');
  console.log(`  country column     : ${countryExists      ? 'OK' : 'MISSING'}`);
  console.log(`  expanded categories: ${expandedCategories ? 'OK' : 'NOT APPLIED'}`);

  if (countryExists && expandedCategories) {
    console.log('\n  [OK] Migration 003 is fully applied.');
  } else {
    console.log('\n  [ACTION REQUIRED] Migration 003 has NOT been applied.');
    console.log('  Please open the Supabase SQL Editor and paste the migration SQL:');
    console.log('  https://supabase.com/dashboard/project/cdlhipiukgjmfimhjlkl/sql/new');
    console.log('\n  File: supabase/migration-003-expanded-categories.sql');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
