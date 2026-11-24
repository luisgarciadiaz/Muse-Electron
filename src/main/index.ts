import { type BrowserWindow, app, globalShortcut, ipcMain, shell } from 'electron';
import { APP_ID, APP_NAME, getMuseUrl, isSafeExternalUrl, loadDotEnv } from './config';
import { createAppMenu } from './menu';
import { registerGlobalToggleShortcut } from './shortcuts';
import { SettingsStore } from './store';
import { createAppTray } from './tray';
import {
  createMainWindow,
  loadMuseHome,
  showAndFocusWindow,
  toggleWindowVisibility,
} from './window';

loadDotEnv();

const isSmokeTest = process.argv.includes('--smoke-test');

const hasSingleInstanceLock = isSmokeTest ? true : app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  let mainWindow: BrowserWindow | null = null;
  let isQuitting = false;

  if (process.platform === 'win32') {
    app.setAppUserModelId(APP_ID);
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      showAndFocusWindow(mainWindow);
    }
  });

  app.on('before-quit', () => {
    isQuitting = true;
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && isQuitting) {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (mainWindow) {
      showAndFocusWindow(mainWindow);
    }
  });

  void app.whenReady().then(() => {
    const store = new SettingsStore();

    let refreshTray = () => {};
    let refreshMenu = () => {};
    const syncState = () => {
      refreshTray();
      refreshMenu();
    };

    mainWindow = createMainWindow(
      store,
      {
        isQuitting: () => isQuitting,
        onStateChange: syncState,
      },
      isSmokeTest
    );

    ipcMain.handle('muse:retry', () => {
      if (mainWindow) {
        loadMuseHome(mainWindow);
      }
    });

    ipcMain.handle('muse:open-external', (_event, targetUrl?: string) => {
      const candidate = typeof targetUrl === 'string' && isSafeExternalUrl(targetUrl)
        ? targetUrl
        : getMuseUrl();
      return shell.openExternal(candidate);
    });

    ipcMain.handle('muse:get-app-info', () => ({
      name: APP_NAME,
      version: app.getVersion(),
      museUrl: getMuseUrl(),
    }));

    const trayController = createAppTray(mainWindow, store, {
      onStateChange: syncState,
      onQuit: () => {
        isQuitting = true;
      },
    });
    refreshTray = trayController.refreshTray;

    const shortcutReg = registerGlobalToggleShortcut(store, () => {
      if (mainWindow) {
        toggleWindowVisibility(mainWindow);
        syncState();
      }
    });

    const menuController = createAppMenu(mainWindow, store, {
      getActiveShortcut: () => shortcutReg.activeShortcut,
      onStateChange: syncState,
      onQuit: () => {
        isQuitting = true;
      },
    });
    refreshMenu = menuController.refreshMenu;

    if (isSmokeTest && mainWindow) {
      const finishSmoke = (reason: string) => {
        if (isQuitting) {
          return;
        }
        isQuitting = true;
        console.log(
          JSON.stringify({
            smokeTest: 'PASS',
            reason,
            windowCreated: Boolean(mainWindow && !mainWindow.isDestroyed()),
            trayCreated: !trayController.tray.isDestroyed(),
            menuReady: true,
            activeShortcut: shortcutReg.activeShortcut,
          })
        );
        app.quit();
      };

      mainWindow.webContents.once('did-finish-load', () => finishSmoke('did-finish-load'));
      mainWindow.webContents.once('did-fail-load', () => finishSmoke('did-fail-load-handled'));
      setTimeout(() => finishSmoke('init-timeout'), 3500);
    }
  });
}
