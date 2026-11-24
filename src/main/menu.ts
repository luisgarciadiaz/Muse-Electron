import {
  type BrowserWindow,
  Menu,
  type MenuItemConstructorOptions,
  app,
  dialog,
  shell,
} from 'electron';
import { APP_NAME, getMuseUrl } from './config';
import { type SettingsStore } from './store';
import { loadMuseHome } from './window';

export interface MenuCallbacks {
  getActiveShortcut: () => string | null;
  onStateChange: () => void;
  onQuit: () => void;
}

export interface AppMenuController {
  refreshMenu: () => void;
}

export function createAppMenu(
  win: BrowserWindow,
  store: SettingsStore,
  callbacks: MenuCallbacks
): AppMenuController {
  const adjustZoom = (delta: number | null) => {
    if (win.isDestroyed()) {
      return;
    }
    const next =
      delta === null
        ? 1.0
        : Math.min(3.0, Math.max(0.5, Number((win.webContents.getZoomFactor() + delta).toFixed(2))));
    win.webContents.setZoomFactor(next);
    store.set('zoomFactor', next);
  };

  const refreshMenu = () => {
    const alwaysOnTop = store.get('alwaysOnTop');
    const minimizeToTray = store.get('minimizeToTray');

    const template: MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Muse Home',
            accelerator: 'CommandOrControl+Shift+H',
            click: () => loadMuseHome(win),
          },
          {
            label: 'Reload',
            accelerator: 'CommandOrControl+R',
            click: () => {
              if (!win.isDestroyed()) {
                win.webContents.reload();
              }
            },
          },
          {
            label: 'Force Reload',
            accelerator: 'CommandOrControl+Shift+R',
            click: () => {
              if (!win.isDestroyed()) {
                win.webContents.reloadIgnoringCache();
              }
            },
          },
          { type: 'separator' },
          {
            label: `Quit ${APP_NAME}`,
            accelerator: 'CommandOrControl+Q',
            click: () => {
              callbacks.onQuit();
              app.quit();
            },
          },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
        ],
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'Always on Top',
            type: 'checkbox',
            checked: alwaysOnTop,
            accelerator: 'CommandOrControl+Shift+T',
            click: (menuItem) => {
              const next = menuItem.checked;
              store.set('alwaysOnTop', next);
              if (!win.isDestroyed()) {
                win.setAlwaysOnTop(next);
              }
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
            label: 'Zoom In',
            accelerator: 'CommandOrControl+=',
            click: () => adjustZoom(0.1),
          },
          {
            label: 'Zoom Out',
            accelerator: 'CommandOrControl+-',
            click: () => adjustZoom(-0.1),
          },
          {
            label: 'Actual Size',
            accelerator: 'CommandOrControl+0',
            click: () => adjustZoom(null),
          },
          { type: 'separator' },
          {
            label: 'Toggle Fullscreen',
            accelerator: 'F11',
            click: () => {
              if (!win.isDestroyed()) {
                win.setFullScreen(!win.isFullScreen());
              }
            },
          },
          {
            label: 'Toggle Developer Tools',
            accelerator: 'CommandOrControl+Shift+I',
            click: () => {
              if (!win.isDestroyed()) {
                win.webContents.toggleDevTools();
              }
            },
          },
        ],
      },
      {
        label: 'Navigation',
        submenu: [
          {
            label: 'Back',
            accelerator: 'Alt+Left',
            click: () => {
              if (!win.isDestroyed() && win.webContents.navigationHistory.canGoBack()) {
                win.webContents.navigationHistory.goBack();
              }
            },
          },
          {
            label: 'Forward',
            accelerator: 'Alt+Right',
            click: () => {
              if (!win.isDestroyed() && win.webContents.navigationHistory.canGoForward()) {
                win.webContents.navigationHistory.goForward();
              }
            },
          },
        ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Open muse.ai in Browser',
            click: () => void shell.openExternal(getMuseUrl()),
          },
          { type: 'separator' },
          {
            label: `About ${APP_NAME}`,
            click: () => {
              const shortcut = callbacks.getActiveShortcut() ?? 'Unavailable';
              void dialog.showMessageBox(win, {
                type: 'info',
                title: `About ${APP_NAME}`,
                message: `${APP_NAME} v${app.getVersion()}`,
                detail: [
                  'Dedicated Electron desktop client for Muse (Meta personal AI assistant).',
                  '',
                  `Target URL: ${getMuseUrl()}`,
                  `Global Quick-Toggle Shortcut: ${shortcut}`,
                ].join('\n'),
              });
            },
          },
        ],
      },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  };

  refreshMenu();
  return { refreshMenu };
}
