import { contextBridge, ipcRenderer } from 'electron';
import type { AgentAction, SessionPermissions } from '@shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
  // --- Existing Remote Control ---
  mouseMove: (x: number, y: number) => ipcRenderer.invoke('mouse-move', { x, y }),
  mouseClick: (button: 'left' | 'right') => ipcRenderer.invoke('mouse-click', { button }),
  keyboardType: (text: string) => ipcRenderer.invoke('keyboard-type', { text }),
  windowControl: (action: 'minimize' | 'maximize' | 'close') => ipcRenderer.send('window-control', action),
  onMainMessage: (callback: (message: string) => void) => 
    ipcRenderer.on('main-process-message', (_, message) => callback(message)),

  // --- Execution Layer (Agentic Actions) ---
  executionSetPermissions: (permissions: SessionPermissions) => 
    ipcRenderer.invoke('execution-set-permissions', permissions),
  executionExecuteAction: (action: AgentAction) => 
    ipcRenderer.invoke('execution-execute-action', action),
  executionGetAuditLog: () => ipcRenderer.invoke('execution-get-audit-log'),
});
