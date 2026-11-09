import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

export const MASTER_SECRET = 'STOVA_MEDIA_QUICKGST_MASTER_SECRET_KEY_2026';
const TRIAL_DAYS = 7;

let cachedMachineId = null;

export function getRawHardwareId() {
  try {
    if (process.platform === 'win32') {
      const out = execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_ComputerSystemProduct).UUID"', {
        encoding: 'utf8',
        timeout: 3000,
        windowsHide: true,
      }).trim();
      if (out && out.length > 8 && !out.toLowerCase().includes('error')) return out;
    } else if (process.platform === 'darwin') {
      const out = execSync("ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/ { print $3; }'", {
        encoding: 'utf8',
        timeout: 3000,
      }).replace(/['"]/g, '').trim();
      if (out) return out;
    } else if (process.platform === 'linux') {
      if (fs.existsSync('/etc/machine-id')) {
        return fs.readFileSync('/etc/machine-id', 'utf8').trim();
      }
    }
  } catch {
    // fallback below
  }
  return `${os.hostname()}-${os.platform()}-${os.arch()}-${os.cpus()?.[0]?.model || ''}`;
}

export function getMachineId() {
  if (cachedMachineId) return cachedMachineId;
  const raw = getRawHardwareId();
  const hash = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
  // Format as MCH-XXXX-XXXX
  cachedMachineId = `MCH-${hash.slice(0, 4)}-${hash.slice(4, 8)}`;
  return cachedMachineId;
}

export function generateLicenseKey(machineId) {
  const cleanId = String(machineId || '').trim().toUpperCase();
  const hmac = crypto.createHmac('sha256', MASTER_SECRET).update(cleanId).digest('hex').toUpperCase();
  return `QGST-${hmac.slice(0, 4)}-${hmac.slice(4, 8)}-${hmac.slice(8, 12)}`;
}

export function verifyLicenseKey(machineId, key) {
  if (!key || typeof key !== 'string') return false;
  const expected = generateLicenseKey(machineId);
  const normalize = (k) => k.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return normalize(expected) === normalize(key);
}

export function getLicenseStatus(dataDir) {
  const machineId = getMachineId();
  const licFile = path.join(dataDir, '.license.json');

  let state = { activated: false, trialStartedAt: null, key: null };
  if (fs.existsSync(licFile)) {
    try {
      state = JSON.parse(fs.readFileSync(licFile, 'utf8'));
    } catch {
      // corrupt file
    }
  }

  // Check if successfully activated on this exact machine
  if (state.activated && state.key) {
    if (verifyLicenseKey(machineId, state.key)) {
      return {
        licensed: true,
        isTrial: false,
        machineId,
        activatedAt: state.activatedAt,
        daysLeft: null,
      };
    }
    // Cloned to another machine!
    return {
      licensed: false,
      isTrial: false,
      machineId,
      daysLeft: 0,
      reason: 'hardware-mismatch',
    };
  }

  // First run: start trial
  const now = Date.now();
  if (!state.trialStartedAt) {
    state.trialStartedAt = now;
    try {
      fs.writeFileSync(licFile, JSON.stringify(state, null, 2), 'utf8');
    } catch {
      /* ignore */
    }
  }

  const elapsedMs = now - Number(state.trialStartedAt);
  const daysLeft = Math.max(0, TRIAL_DAYS - Math.floor(elapsedMs / 86400000));
  const isTrial = daysLeft > 0;

  return {
    licensed: false,
    isTrial,
    daysLeft,
    machineId,
    trialStartedAt: state.trialStartedAt,
  };
}

export function activateLicense(dataDir, key) {
  const machineId = getMachineId();
  if (!verifyLicenseKey(machineId, key)) {
    return { success: false, error: 'Invalid license key for this computer. Please check and try again.' };
  }

  const licFile = path.join(dataDir, '.license.json');
  const payload = {
    activated: true,
    key: key.trim().toUpperCase(),
    machineId,
    activatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(licFile, JSON.stringify(payload, null, 2), 'utf8');
  return { success: true, message: 'QuickGST Billing has been successfully activated!' };
}
