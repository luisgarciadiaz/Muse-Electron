import { contextBridge, ipcRenderer } from 'electron';

export interface MuseDesktopApi {
  retryConnection: () => Promise<void>;
  openInBrowser: (url?: string) => Promise<void>;
  getAppInfo: () => Promise<{ name: string; version: string; museUrl: string }>;
}

const api: MuseDesktopApi = {
  retryConnection: () => ipcRenderer.invoke('muse:retry'),
  openInBrowser: (url?: string) => ipcRenderer.invoke('muse:open-external', url),
  getAppInfo: () => ipcRenderer.invoke('muse:get-app-info'),
};

contextBridge.exposeInMainWorld('museDesktop', api);
