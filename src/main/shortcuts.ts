import { globalShortcut } from 'electron';
import { FALLBACK_SHORTCUT } from './config';
import { type SettingsStore } from './store';

export interface ShortcutRegistration {
  activeShortcut: string | null;
  unregister: () => void;
}

export function registerGlobalToggleShortcut(
  store: SettingsStore,
  onTrigger: () => void
): ShortcutRegistration {
  const preferred = store.get('globalShortcut');
  const candidates = preferred === FALLBACK_SHORTCUT ? [preferred] : [preferred, FALLBACK_SHORTCUT];

  let activeShortcut: string | null = null;

  for (const accelerator of candidates) {
    try {
      if (globalShortcut.register(accelerator, onTrigger)) {
        activeShortcut = accelerator;
        break;
      }
    } catch {
      // Try next fallback accelerator
    }
  }

  return {
    activeShortcut,
    unregister: () => {
      if (activeShortcut) {
        globalShortcut.unregister(activeShortcut);
        activeShortcut = null;
      }
    },
  };
}
