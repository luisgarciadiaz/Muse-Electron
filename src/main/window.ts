import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  BrowserWindow,
  Menu,
  clipboard,
  session,
  shell,
  type MenuItemConstructorOptions,
} from 'electron';
import {
  APP_NAME,
  SESSION_PARTITION,
  getAssetPath,
  getMuseUrl,
  getOfflinePagePath,
  getSanitizedUserAgent,
  isAllowedInAppAuthUrl,
  isSafeExternalUrl,
  isTrustedMuseOrigin,
} from './config';
import { type SettingsStore, getSafeWindowBounds } from './store';

export interface WindowCallbacks {
  isQuitting: () => boolean;
  onStateChange?: () => void;
}

const ALLOWED_PERMISSIONS = new Set([
  'notifications',
  'clipboard-read',
  'clipboard-sanitized-write',
  'media',
  'fullscreen',
]);

export function loadMuseHome(win: BrowserWindow): void {
  if (!win.isDestroyed()) {
    void win.loadURL(getMuseUrl());
  }
}

export function showAndFocusWindow(win: BrowserWindow): void {
  if (win.isDestroyed()) {
    return;
  }
  if (win.isMinimized()) {
    win.restore();
  }
  if (!win.isVisible()) {
    win.show();
  }
  win.focus();
}

export function toggleWindowVisibility(win: BrowserWindow): void {
  if (win.isDestroyed()) {
    return;
  }
  if (win.isVisible() && win.isFocused()) {
    win.hide();
    return;
  }
  showAndFocusWindow(win);
}

export function createMainWindow(
  store: SettingsStore,
  callbacks: WindowCallbacks,
  isSmokeTest: boolean
): BrowserWindow {
  const museSession = session.fromPartition(SESSION_PARTITION);
  const sanitizedUa = getSanitizedUserAgent(museSession.getUserAgent());
  museSession.setUserAgent(sanitizedUa);

  museSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const currentUrl = webContents.getURL();
    const allowed = ALLOWED_PERMISSIONS.has(permission) && isTrustedMuseOrigin(currentUrl);
    callback(allowed);
  });

  const savedBounds = store.get('windowBounds');
  const safeBounds = getSafeWindowBounds(savedBounds);

  const iconFile = process.platform === 'win32' ? 'icon.ico' : 'icon.png';

  const win = new BrowserWindow({
    x: safeBounds.x,
    y: safeBounds.y,
    width: safeBounds.width,
    height: safeBounds.height,
    minWidth: 480,
    minHeight: 400,
    title: APP_NAME,
    icon: getAssetPath(iconFile),
    backgroundColor: '#0f1117',
    show: false,
    alwaysOnTop: store.get('alwaysOnTop'),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      partition: SESSION_PARTITION,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  win.webContents.setUserAgent(sanitizedUa);

  win.once('ready-to-show', () => {
    win.webContents.setZoomFactor(store.get('zoomFactor'));
    if (!isSmokeTest) {
      if (safeBounds.isMaximized) {
        win.maximize();
      }
      win.show();
    }
  });

  // Allow Meta/Muse OAuth popups in-app; route all other links to default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedInAppAuthUrl(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 520,
          height: 700,
          autoHideMenuBar: true,
          backgroundColor: '#0f1117',
          icon: getAssetPath(iconFile),
          webPreferences: {
            partition: SESSION_PARTITION,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
          },
        },
      };
    }

    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('file://') || isAllowedInAppAuthUrl(url)) {
      return;
    }
    event.preventDefault();
    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url);
    }
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    // Ignore ERR_ABORTED (-3) caused by normal redirects or manual stops
    if (!isMainFrame || errorCode === -3 || validatedURL.startsWith('file://')) {
      return;
    }

    const offlineUrl = pathToFileURL(getOfflinePagePath());
    offlineUrl.searchParams.set('url', validatedURL || getMuseUrl());
    offlineUrl.searchParams.set('error', `${errorDescription || 'Connection failed'} (${errorCode})`);
    void win.loadURL(offlineUrl.toString());
  });

  // Native right-click context menu
  win.webContents.on('context-menu', (_event, params) => {
    const template: MenuItemConstructorOptions[] = [];

    if (params.misspelledWord && params.dictionarySuggestions.length > 0) {
      for (const suggestion of params.dictionarySuggestions.slice(0, 5)) {
        template.push({
          label: suggestion,
          click: () => win.webContents.replaceMisspelling(suggestion),
        });
      }
      template.push({ type: 'separator' });
    }

    if (params.isEditable) {
      template.push(
        { role: 'cut', enabled: params.editFlags.canCut },
        { role: 'copy', enabled: params.editFlags.canCopy },
        { role: 'paste', enabled: params.editFlags.canPaste },
        { role: 'selectAll', enabled: params.editFlags.canSelectAll }
      );
    } else if (params.selectionText) {
      template.push({ role: 'copy' });
    }

    if (params.linkURL && isSafeExternalUrl(params.linkURL)) {
      if (template.length > 0) {
        template.push({ type: 'separator' });
      }
      template.push(
        {
          label: 'Open Link in Browser',
          click: () => void shell.openExternal(params.linkURL),
        },
        {
          label: 'Copy Link Address',
          click: () => clipboard.writeText(params.linkURL),
        }
      );
    }

    if (template.length > 0) {
      template.push({ type: 'separator' });
    }

    template.push(
      {
        label: 'Back',
        enabled: win.webContents.navigationHistory.canGoBack(),
        click: () => win.webContents.navigationHistory.goBack(),
      },
      {
        label: 'Forward',
        enabled: win.webContents.navigationHistory.canGoForward(),
        click: () => win.webContents.navigationHistory.goForward(),
      },
      {
        label: 'Reload',
        click: () => win.webContents.reload(),
      }
    );

    Menu.buildFromTemplate(template).popup({ window: win });
  });

  // Persist window bounds cleanly
  let boundsTimer: NodeJS.Timeout | undefined;
  const persistBounds = () => {
    if (win.isDestroyed()) {
      return;
    }
    const isMaximized = win.isMaximized();
    const current = store.get('windowBounds');
    if (isMaximized) {
      store.set('windowBounds', { ...current, isMaximized: true });
      return;
    }
    const normalBounds = win.getNormalBounds();
    store.set('windowBounds', {
      x: normalBounds.x,
      y: normalBounds.y,
      width: normalBounds.width,
      height: normalBounds.height,
      isMaximized: false,
    });
  };

  const schedulePersistBounds = () => {
    if (boundsTimer) {
      clearTimeout(boundsTimer);
    }
    boundsTimer = setTimeout(persistBounds, 250);
  };

  win.on('resize', schedulePersistBounds);
  win.on('move', schedulePersistBounds);
  win.on('maximize', persistBounds);
  win.on('unmaximize', persistBounds);

  win.webContents.on('zoom-changed', () => {
    if (!win.isDestroyed()) {
      store.set('zoomFactor', win.webContents.getZoomFactor());
    }
  });

  win.on('close', (event) => {
    if (!callbacks.isQuitting() && store.get('minimizeToTray')) {
      event.preventDefault();
      win.hide();
      callbacks.onStateChange?.();
    }
  });

  win.on('show', () => callbacks.onStateChange?.());
  win.on('hide', () => callbacks.onStateChange?.());

  loadMuseHome(win);
  return win;
}
