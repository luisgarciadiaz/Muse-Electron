import { type BrowserWindow, Menu, Tray, app, nativeImage, shell } from 'electron';
import { APP_NAME, getAssetPath, getMuseUrl } from './config';
import { type SettingsStore } from './store';
import { loadMuseHome, toggleWindowVisibility } from './window';

export interface TrayCallbacks {
  onStateChange: () => void;
  onQuit: () => void;
}

export interface AppTrayController {
  tray: Tray;
  refreshTray: () => void;
}

export function createAppTray(
  win: BrowserWindow,
  store: SettingsStore,
  callbacks: TrayCallbacks
): AppTrayController {
  const icon = nativeImage.createFromPath(getAssetPath('tray.png'));
  const tray = new Tray(icon);
  tray.setToolTip(APP_NAME);

  const refreshTray = () => {
    if (win.isDestroyed()) {
      return;
    }

    const isVisible = win.isVisible();
    const alwaysOnTop = store.get('alwaysOnTop');
    const minimizeToTray = store.get('minimizeToTray');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: isVisible ? 'Hide Muse' : 'Show Muse',
        click: () => {
          toggleWindowVisibility(win);
          callbacks.onStateChange();
        },
      },
      {
        label: 'Always on Top',
        type: 'checkbox',
        checked: alwaysOnTop,
        click: (menuItem) => {
          const next = menuItem.checked;
          store.set('alwaysOnTop', next);
          win.setAlwaysOnTop(next);
          callbacks.onStateChange();
        },
      },
      {
        label: 'Minimize to Tray on Close',
        type: 'checkbox',
        checked: minimizeToTray,
        click: (menuItem) => {
          store.set('minimizeToTray', menuItem.checked);
          callbacks.onStateChange();
        },
      },
      { type: 'separator' },
      {
        label: 'Go to Muse Home',
        click: () => {
          loadMuseHome(win);
          if (!win.isVisible()) {
            win.show();
          }
          win.focus();
        },
      },
      {
        label: 'Reload',
        click: () => {
          if (!win.isDestroyed()) {
            win.webContents.reload();
          }
        },
      },
      {
        label: 'Open muse.ai in Browser',
        click: () => void shell.openExternal(getMuseUrl()),
      },
      { type: 'separator' },
      {
        label: `Quit ${APP_NAME}`,
        click: () => {
          callbacks.onQuit();
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);
  };

  tray.on('click', () => {
    toggleWindowVisibility(win);
    callbacks.onStateChange();
  });

  refreshTray();

  return { tray, refreshTray };
}
