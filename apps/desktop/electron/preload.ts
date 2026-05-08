import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  mouseMove: (x: number, y: number) => ipcRenderer.invoke('mouse-move', { x, y }),
  mouseClick: (button: 'left' | 'right') => ipcRenderer.invoke('mouse-click', { button }),
  keyboardType: (text: string) => ipcRenderer.invoke('keyboard-type', { text }),
  windowControl: (action: 'minimize' | 'maximize' | 'close') => ipcRenderer.send('window-control', action),
  onMainMessage: (callback: (message: string) => void) => 
    ipcRenderer.on('main-process-message', (_, message) => callback(message)),
});
