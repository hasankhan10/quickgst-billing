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
      let machineGuid = '';
      try {
        const reg = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', {
          encoding: 'utf8',
          timeout: 2000,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        const m = reg.match(/MachineGuid\s+REG_SZ\s+([A-Fa-f0-9\-]+)/);
        if (m) machineGuid = m[1].trim();
      } catch {
        /* ignore */
      }

      let biosUuid = '';
      try {
        biosUuid = execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_ComputerSystemProduct).UUID"', {
          encoding: 'utf8',
          timeout: 3000,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
      } catch {
        /* ignore */
      }

      const combined = `${machineGuid || ''}|${biosUuid || ''}`;
      if (combined.length > 10) return combined;
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

function getCipherKey(machineId) {
  return crypto.createHash('sha256').update(`${machineId}:${MASTER_SECRET}`).digest();
}

function encryptRecord(record, machineId) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getCipherKey(machineId), iv);
  const data = Buffer.from(JSON.stringify(record), 'utf8');
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function decryptRecord(str, machineId) {
  try {
    const buf = Buffer.from(str, 'base64');
    if (buf.length < 28) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', getCipherKey(machineId), iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return JSON.parse(dec.toString('utf8'));
  } catch {
    return null;
  }
}

function getExternalAnchorPaths() {
  const paths = [];
  if (process.env.APPDATA) paths.push(path.join(process.env.APPDATA, 'QuickGST', '.license.dat'));
  if (process.env.LOCALAPPDATA) paths.push(path.join(process.env.LOCALAPPDATA, 'QuickGST', '.trial.dat'));
  try {
    paths.push(path.join(os.homedir(), '.quickgst_sys.dat'));
  } catch {
    /* ignore */
  }
  return paths;
}

function readRegistryRecord(machineId) {
  if (process.platform !== 'win32') return null;
  try {
    const out = execSync('reg query "HKCU\\Software\\QuickGST" /v Registration', {
      encoding: 'utf8',
      timeout: 2000,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const m = out.match(/Registration\s+REG_SZ\s+(\S+)/);
    if (m && m[1]) return decryptRecord(m[1].trim(), machineId);
  } catch {
    /* ignore */
  }
  return null;
}

function writeRegistryRecord(record, machineId) {
  if (process.platform !== 'win32') return;
  try {
    const enc = encryptRecord(record, machineId);
    execSync(`reg add "HKCU\\Software\\QuickGST" /v Registration /t REG_SZ /d "${enc}" /f`, {
      timeout: 2000,
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
  } catch {
    /* ignore */
  }
}

function readFileRecord(filePath, machineId) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (raw.startsWith('{')) {
      const parsed = JSON.parse(raw);
      if (parsed.enc) {
        const dec = decryptRecord(parsed.enc, machineId);
        if (dec) return dec;
      }
      return parsed;
    }
    return decryptRecord(raw, machineId);
  } catch {
    return null;
  }
}

function writeFileRecord(filePath, record, machineId) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const enc = encryptRecord(record, machineId);
    if (filePath.endsWith('.json')) {
      fs.writeFileSync(filePath, JSON.stringify({ ...record, enc }, null, 2), 'utf8');
    } else {
      fs.writeFileSync(filePath, enc, 'utf8');
    }
  } catch {
    /* ignore */
  }
}

// Data-anchor check: if all external anchors were deleted, check oldest existing bill date
function getOldestBillTimestamp(dataDir) {
  try {
    if (!dataDir) return null;
    const billsDir = path.join(dataDir, 'bills');
    if (!fs.existsSync(billsDir)) return null;
    const files = fs.readdirSync(billsDir).filter((f) => f.endsWith('.json'));
    let oldest = null;
    for (const f of files) {
      try {
        const stat = fs.statSync(path.join(billsDir, f));
        const birth = stat.birthtimeMs || stat.mtimeMs;
        if (!oldest || birth < oldest) oldest = birth;
      } catch {
        /* skip */
      }
    }
    return oldest;
  } catch {
    return null;
  }
}

export function getLicenseStatus(dataDir) {
  const machineId = getMachineId();
  const localLicFile = dataDir ? path.join(dataDir, '.license.json') : null;
  const externalPaths = getExternalAnchorPaths();

  // Read all 5 anchor locations
  const records = [];
  const regRec = readRegistryRecord(machineId);
  if (regRec) records.push({ source: 'registry', data: regRec });

  for (const p of externalPaths) {
    const fRec = readFileRecord(p, machineId);
    if (fRec) records.push({ source: p, data: fRec });
  }

  if (localLicFile) {
    const locRec = readFileRecord(localLicFile, machineId);
    if (locRec) records.push({ source: localLicFile, data: locRec });
  }

  // 1. Check if ANY anchor contains a valid lifetime license activation for this machine
  for (const { data } of records) {
    if (data.activated && data.key) {
      if (verifyLicenseKey(machineId, data.key)) {
        const activeRecord = {
          activated: true,
          key: data.key.trim().toUpperCase(),
          machineId,
          activatedAt: data.activatedAt || new Date().toISOString(),
        };

        // Self-heal: ensure all anchors have this activation saved
        if (records.length < (externalPaths.length + (localLicFile ? 1 : 0) + (process.platform === 'win32' ? 1 : 0))) {
          writeRegistryRecord(activeRecord, machineId);
          for (const p of externalPaths) writeFileRecord(p, activeRecord, machineId);
          if (localLicFile) writeFileRecord(localLicFile, activeRecord, machineId);
        }

        return {
          licensed: true,
          isTrial: false,
          machineId,
          activatedAt: activeRecord.activatedAt,
          daysLeft: null,
        };
      }

      // Cloned from a different computer
      return {
        licensed: false,
        isTrial: false,
        machineId,
        daysLeft: 0,
        reason: 'hardware-mismatch',
      };
    }
  }

  // 2. Trial evaluation: Find earliest start date and latest seen date across all anchors
  const now = Date.now();
  let earliestStart = null;
  let latestSeen = 0;

  for (const { data } of records) {
    if (data.trialStartedAt) {
      const t = Number(data.trialStartedAt);
      if (!Number.isNaN(t) && (!earliestStart || t < earliestStart)) earliestStart = t;
    }
    if (data.lastSeenAt) {
      const ls = Number(data.lastSeenAt);
      if (!Number.isNaN(ls) && ls > latestSeen) latestSeen = ls;
    }
  }

  // If no anchor records exist, check existing data (bills) to prevent clean reinstall wipe
  if (!earliestStart) {
    const oldestBillTime = getOldestBillTimestamp(dataDir);
    if (oldestBillTime && oldestBillTime < now) {
      earliestStart = oldestBillTime;
    } else {
      // Genuinely clean first install on this machine
      earliestStart = now;
    }
  }

  // Anti-rollback check: if clock is rolled back by > 5 minutes, enforce latestSeen
  const effectiveNow = (latestSeen && now < (latestSeen - 300_000)) ? latestSeen : now;
  const updatedLastSeen = Math.max(latestSeen, now);

  const elapsedMs = Math.max(0, effectiveNow - earliestStart);
  const daysLeft = Math.max(0, TRIAL_DAYS - Math.floor(elapsedMs / 86400000));
  const isTrial = daysLeft > 0;

  // Persist updated trial state across all anchors (Registry, AppData, LocalAppData, UserProfile, DataDir)
  const trialRecord = {
    activated: false,
    trialStartedAt: earliestStart,
    lastSeenAt: updatedLastSeen,
    machineId,
  };

  writeRegistryRecord(trialRecord, machineId);
  for (const p of externalPaths) writeFileRecord(p, trialRecord, machineId);
  if (localLicFile) writeFileRecord(localLicFile, trialRecord, machineId);

  return {
    licensed: false,
    isTrial,
    daysLeft,
    machineId,
    trialStartedAt: earliestStart,
  };
}

export function activateLicense(dataDir, key) {
  const machineId = getMachineId();
  if (!verifyLicenseKey(machineId, key)) {
    return { success: false, error: 'Invalid license key for this computer. Please check and try again.' };
  }

  const payload = {
    activated: true,
    key: key.trim().toUpperCase(),
    machineId,
    activatedAt: new Date().toISOString(),
  };

  // Write activation permanently to ALL 5 anchors
  writeRegistryRecord(payload, machineId);
  for (const p of getExternalAnchorPaths()) {
    writeFileRecord(p, payload, machineId);
  }
  if (dataDir) {
    writeFileRecord(path.join(dataDir, '.license.json'), payload, machineId);
  }

  return { success: true, message: 'QuickGST Billing has been successfully activated for lifetime use!' };
}
