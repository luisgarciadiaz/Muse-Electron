import fs from 'node:fs';
import path from 'node:path';
import { app, screen } from 'electron';
import { getDefaultShortcut } from './config';

export interface WindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

export interface AppSettings {
  windowBounds: WindowBounds;
  alwaysOnTop: boolean;
  minimizeToTray: boolean;
  globalShortcut: string;
  zoomFactor: number;
}

function createDefaultSettings(): AppSettings {
  return {
    windowBounds: {
      width: 1200,
      height: 800,
      isMaximized: false,
    },
    alwaysOnTop: false,
    minimizeToTray: true,
    globalShortcut: getDefaultShortcut(),
    zoomFactor: 1.0,
  };
}

export class SettingsStore {
  private readonly filePath: string;
  private settings: AppSettings;

  constructor() {
    this.filePath = path.join(app.getPath('userData'), 'config.json');
    this.settings = this.load();
  }

  private load(): AppSettings {
    const defaults = createDefaultSettings();
    try {
      if (!fs.existsSync(this.filePath)) {
        return defaults;
      }
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {
        windowBounds: {
          ...defaults.windowBounds,
          ...(parsed.windowBounds ?? {}),
        },
        alwaysOnTop:
          typeof parsed.alwaysOnTop === 'boolean' ? parsed.alwaysOnTop : defaults.alwaysOnTop,
        minimizeToTray:
          typeof parsed.minimizeToTray === 'boolean'
            ? parsed.minimizeToTray
            : defaults.minimizeToTray,
        globalShortcut:
          typeof parsed.globalShortcut === 'string' && parsed.globalShortcut.trim().length > 0
            ? parsed.globalShortcut.trim()
            : defaults.globalShortcut,
        zoomFactor:
          typeof parsed.zoomFactor === 'number' &&
          Number.isFinite(parsed.zoomFactor) &&
          parsed.zoomFactor >= 0.5 &&
          parsed.zoomFactor <= 3.0
            ? parsed.zoomFactor
            : defaults.zoomFactor,
      };
    } catch {
      return defaults;
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const tmpPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.settings, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.filePath);
    } catch {
      // Ignore write failures on restricted filesystems
    }
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.settings[key];
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.settings[key] = value;
    this.save();
  }

  getAll(): AppSettings {
    return {
      ...this.settings,
      windowBounds: { ...this.settings.windowBounds },
    };
  }
}

export function getSafeWindowBounds(saved: WindowBounds): WindowBounds {
  const width = Math.max(480, Math.round(saved.width || 1200));
  const height = Math.max(400, Math.round(saved.height || 800));

  if (typeof saved.x !== 'number' || typeof saved.y !== 'number') {
    return { width, height, isMaximized: Boolean(saved.isMaximized) };
  }

  const x = Math.round(saved.x);
  const y = Math.round(saved.y);
  const displays = screen.getAllDisplays();

  const isVisibleOnAnyDisplay = displays.some((display) => {
    const area = display.workArea;
    const overlapX = Math.min(x + width, area.x + area.width) - Math.max(x, area.x);
    const overlapY = Math.min(y + height, area.y + area.height) - Math.max(y, area.y);
    return overlapX >= 80 && overlapY >= 60;
  });

  if (!isVisibleOnAnyDisplay) {
    return { width, height, isMaximized: Boolean(saved.isMaximized) };
  }

  return {
    x,
    y,
    width,
    height,
    isMaximized: Boolean(saved.isMaximized),
  };
}
