const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('padwatch', { combo: () => ipcRenderer.send('pad:combo') });
