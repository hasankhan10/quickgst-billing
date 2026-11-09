#!/usr/bin/env node

/**
 * QuickGST Billing - License Key Generator
 * Built by Stova Media
 * 
 * Usage:
 *   node scripts/keygen.mjs <MACHINE_ID>
 *   e.g.: node scripts/keygen.mjs MCH-9E62-3532
 */

import { generateLicenseKey } from '../src/utils/license.js';

const machineId = process.argv[2];

if (!machineId) {
  console.log('\n======================================================');
  console.log('   QuickGST Billing - License Generator (Stova Media)');
  console.log('======================================================');
  console.log('Error: Please provide a Machine ID.\n');
  console.log('Usage:');
  console.log('  node scripts/keygen.mjs <MACHINE_ID>');
  console.log('Example:');
  console.log('  node scripts/keygen.mjs MCH-9E62-3532\n');
  process.exit(1);
}

const key = generateLicenseKey(machineId);

console.log('\n======================================================');
console.log('   QuickGST Billing - License Key (Stova Media)');
console.log('======================================================');
console.log(` Machine ID   : ${machineId.toUpperCase()}`);
console.log(` License Key  : ${key}`);
console.log(' Status       : Valid Lifetime License');
console.log('======================================================\n');
