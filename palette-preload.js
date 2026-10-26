const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pal', {
  query: (q) => ipcRenderer.invoke('palette:query', q),
  launch: (id) => ipcRenderer.invoke('palette:launch', id),
  open: (id) => ipcRenderer.invoke('palette:open', id),
  close: () => ipcRenderer.invoke('palette:close'),
  resize: (h) => ipcRenderer.invoke('palette:resize', h),
  theme: () => ipcRenderer.invoke('palette:theme'),
  onShow: (cb) => ipcRenderer.on('palette:show', () => cb()),
});
