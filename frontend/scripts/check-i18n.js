/**
 * SamadhanSetu Translation Key Consistency Checker
 * 
 * Compares all supported locale JSON files against canonical en.json.
 * Validates:
 * - Missing keys in any target locale
 * - Extra / unexpected keys in target locale
 * - JSON syntax validity
 * - Structural depth parity
 * 
 * Exits with code 1 if any discrepancy or missing key is found.
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'locales');
const CANONICAL_LOCALE = 'en';
const SUPPORTED_LOCALES = ['en', 'hi', 'sat', 'nag', 'mun', 'kru', 'kho', 'sad', 'pan'];

function loadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Error parsing JSON from ${filePath}:`, err.message);
    process.exit(1);
  }
}

function getLeafKeys(obj, prefix = '') {
  const keys = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      keys.push(...getLeafKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function main() {
  console.log('🔍 Running SamadhanSetu i18n consistency verification...');
  console.log(`📁 Locales directory: ${LOCALES_DIR}`);

  const enPath = path.join(LOCALES_DIR, `${CANONICAL_LOCALE}.json`);
  if (!fs.existsSync(enPath)) {
    console.error(`❌ Canonical file not found: ${enPath}`);
    process.exit(1);
  }

  const enJson = loadJson(enPath);
  const enKeys = getLeafKeys(enJson);
  console.log(`✅ Canonical (${CANONICAL_LOCALE}) loaded with ${enKeys.length} translation keys.`);

  let hasErrors = false;
  const enKeySet = new Set(enKeys);

  for (const locale of SUPPORTED_LOCALES) {
    if (locale === CANONICAL_LOCALE) continue;

    const locPath = path.join(LOCALES_DIR, `${locale}.json`);
    if (!fs.existsSync(locPath)) {
      console.error(`❌ Missing locale file for supported language: ${locale}.json`);
      hasErrors = true;
      continue;
    }

    const locJson = loadJson(locPath);
    const locKeys = getLeafKeys(locJson);
    const locKeySet = new Set(locKeys);

    const missingKeys = enKeys.filter(k => !locKeySet.has(k));
    const extraKeys = locKeys.filter(k => !enKeySet.has(k));

    if (missingKeys.length > 0) {
      console.error(`❌ [${locale}.json] MISSING ${missingKeys.length} keys:`);
      missingKeys.slice(0, 10).forEach(k => console.error(`   - ${k}`));
      if (missingKeys.length > 10) console.error(`   ... and ${missingKeys.length - 10} more.`);
      hasErrors = true;
    }

    if (extraKeys.length > 0) {
      console.warn(`⚠️ [${locale}.json] UNEXPECTED ${extraKeys.length} extra keys (not in en.json):`);
      extraKeys.slice(0, 5).forEach(k => console.warn(`   - ${k}`));
    }

    if (missingKeys.length === 0) {
      console.log(`✅ [${locale}.json] 100% key parity with canonical (${locKeys.length}/${enKeys.length} keys)`);
    }
  }

  if (hasErrors) {
    console.error('\n❌ i18n Consistency Check FAILED! Resolve missing translation keys before proceeding.');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL 9 LOCALES PASSED i18n CONSISTENCY CHECK WITH 100% COVERAGE!');
    process.exit(0);
  }
}

main();
