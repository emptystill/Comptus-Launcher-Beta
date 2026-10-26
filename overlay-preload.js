const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlay', {
  getState: () => ipcRenderer.invoke('overlay:state'),
  shot: () => ipcRenderer.invoke('overlay:shot'),
  exit: () => ipcRenderer.invoke('overlay:exit'),
  showLauncher: () => ipcRenderer.invoke('overlay:showLauncher'),
  volume: (d) => ipcRenderer.invoke('overlay:volume', d),
  mixList: () => ipcRenderer.invoke('overlay:mixer:list'),
  mixSet: (pid, v) => ipcRenderer.invoke('overlay:mixer:set', pid, v),
  mixMute: (pid) => ipcRenderer.invoke('overlay:mixer:mute', pid),
  resize: (h) => ipcRenderer.send('overlay:resize', h),
  hide: () => ipcRenderer.invoke('overlay:hide'),
  onNav: (cb) => ipcRenderer.on('overlay:nav', (_e, d) => cb(d)),
  onMode: (cb) => ipcRenderer.on('overlay:mode', (_e, mode, payload) => cb(mode, payload)),
});
