import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { app } from 'electron';

export const APP_NAME = 'Muse Desktop';
export const APP_ID = 'com.vectornetworks.muse-desktop';
export const DEFAULT_MUSE_URL = 'https://muse.ai';
export const SESSION_PARTITION = 'persist:muse';
export const DEFAULT_SHORTCUT = 'Alt+Space';
export const FALLBACK_SHORTCUT = 'CommandOrControl+Shift+M';

const ALLOWED_AUTH_DOMAINS = [
  'muse.ai',
  'meta.com',
  'meta.ai',
  'facebook.com',
  'fb.com',
  'instagram.com',
  'whatsapp.com',
];

export function loadDotEnv(): void {
  if (app.isPackaged) {
    return;
  }

  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '..', '..', '.env'),
  ];

  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) {
      continue;
    }
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) {
          continue;
        }
        const eqIdx = line.indexOf('=');
        if (eqIdx <= 0) {
          continue;
        }
        const key = line.slice(0, eqIdx).trim();
        let value = line.slice(eqIdx + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (key && process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
      break;
    } catch {
      // Ignore unreadable .env files
    }
  }
}

export function getMuseUrl(): string {
  const raw = process.env.MUSE_APP_URL?.trim();
  if (!raw) {
    return DEFAULT_MUSE_URL;
  }
  try {
    const parsed = new URL(raw);
    const isLocalDevHttp =
      !app.isPackaged &&
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
    if (parsed.protocol === 'https:' || isLocalDevHttp) {
      return parsed.toString();
    }
  } catch {
    // Fall back to default URL
  }
  return DEFAULT_MUSE_URL;
}

export function getDefaultShortcut(): string {
  const raw = process.env.MUSE_SHORTCUT?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_SHORTCUT;
}

function matchesDomain(hostname: string, domain: string): boolean {
  const host = hostname.toLowerCase();
  return host === domain || host.endsWith(`.${domain}`);
}

export function isTrustedMuseOrigin(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    const configuredOrigin = new URL(getMuseUrl()).origin;
    if (parsed.origin === configuredOrigin) {
      return true;
    }
    return parsed.protocol === 'https:' && matchesDomain(parsed.hostname, 'muse.ai');
  } catch {
    return false;
  }
}

export function isAllowedInAppAuthUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.origin === new URL(getMuseUrl()).origin) {
      return true;
    }
    if (parsed.protocol !== 'https:') {
      return false;
    }
    return ALLOWED_AUTH_DOMAINS.some((domain) => matchesDomain(parsed.hostname, domain));
  } catch {
    return false;
  }
}

export function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function getSanitizedUserAgent(rawUa: string): string {
  return rawUa
    .replace(/\sElectron\/[^\s]+/gi, '')
    .replace(/\smuse-electron\/[^\s]+/gi, '')
    .replace(/\sMuse\s*Desktop\/[^\s]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function getAssetPath(...segments: string[]): string {
  return path.resolve(__dirname, '..', '..', 'assets', ...segments);
}

export function getOfflinePagePath(): string {
  return path.resolve(__dirname, '..', 'renderer', 'offline.html');
}

export function isOfflinePageUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'file:') {
      return false;
    }
    const expectedPath = pathToFileURL(getOfflinePagePath()).pathname;
    if (process.platform === 'win32') {
      return parsed.pathname.toLowerCase() === expectedPath.toLowerCase();
    }
    return parsed.pathname === expectedPath;
  } catch {
    return false;
  }
}
