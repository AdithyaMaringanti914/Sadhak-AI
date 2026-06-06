import { app, BrowserWindow, ipcMain, screen as electronScreen } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mouse, keyboard, Button, Key, screen } from '@computer-use/nut-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null;
// ⚡️ Web-Core is the path to the index.html file
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

// --- Execution Layer State ---
interface ExecutionState {
  permissions: {
    canViewScreen: boolean;
    canControl: boolean;
    canAutomate: boolean;
    requirePerActionConsent: boolean;
  };
  auditLog: Array<{
    timestamp: number;
    actionType: string;
    details: any;
    status: 'REQUESTED' | 'EXECUTED' | 'BLOCKED';
  }>;
}

const executionState: ExecutionState = {
  permissions: {
    canViewScreen: false,
    canControl: false,
    canAutomate: false,
    requirePerActionConsent: false,
  },
  auditLog: [],
};

function logAuditEntry(entry: Omit<ExecutionState['auditLog'][0], 'timestamp'>) {
  const fullEntry = {
    ...entry,
    timestamp: Date.now(),
  };
  executionState.auditLog.push(fullEntry);
  console.log('[AUDIT LOG]', fullEntry);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(process.env.DIST, 'index.html'));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

import pkg from 'electron-updater';
const { autoUpdater } = pkg;

app.whenReady().then(() => {
  createWindow();
  
  // Check for updates seamlessly in the background
  autoUpdater.checkForUpdatesAndNotify();
});

// --- IPC Handlers for Remote Control & Execution Layer ---

ipcMain.handle('mouse-move', async (_, { x, y }) => {
  if (!executionState.permissions.canControl) {
    logAuditEntry({
      actionType: 'MOUSE_MOVE',
      details: { x, y },
      status: 'BLOCKED',
    });
    throw new Error('Permission denied: Remote control not enabled');
  }
  
  logAuditEntry({
    actionType: 'MOUSE_MOVE',
    details: { x, y },
    status: 'EXECUTED',
  });
  
  await mouse.setPosition({ x, y });
});

ipcMain.handle('mouse-click', async (_, { button = 'left' }) => {
  if (!executionState.permissions.canControl) {
    logAuditEntry({
      actionType: 'MOUSE_CLICK',
      details: { button },
      status: 'BLOCKED',
    });
    throw new Error('Permission denied: Remote control not enabled');
  }
  
  const btn = button === 'right' ? Button.RIGHT : Button.LEFT;
  
  logAuditEntry({
    actionType: 'MOUSE_CLICK',
    details: { button },
    status: 'EXECUTED',
  });
  
  await mouse.click(btn);
});

ipcMain.handle('keyboard-type', async (_, { text }) => {
  if (!executionState.permissions.canControl) {
    logAuditEntry({
      actionType: 'KEYBOARD_TYPE',
      details: { text: text.length > 50 ? text.substring(0, 50) + '...' : text },
      status: 'BLOCKED',
    });
    throw new Error('Permission denied: Remote control not enabled');
  }
  
  logAuditEntry({
    actionType: 'KEYBOARD_TYPE',
    details: { text: text.length > 50 ? text.substring(0, 50) + '...' : text },
    status: 'EXECUTED',
  });
  
  await keyboard.type(text);
});

ipcMain.handle('keyboard-press', async (_, { key }) => {
  if (!executionState.permissions.canControl) {
    logAuditEntry({
      actionType: 'KEYBOARD_PRESS',
      details: { key },
      status: 'BLOCKED',
    });
    throw new Error('Permission denied: Remote control not enabled');
  }
  // Mapping for nut-js keys can be added here
  // await keyboard.pressKey(Key[key as keyof typeof Key]);
});

ipcMain.handle('get-screen-sources', async () => {
  // We can use desktopCapturer here if needed, or other methods
  return [];
});

ipcMain.on('window-control', (_, action) => {
  if (!win) return;
  switch (action) {
    case 'minimize': win.minimize(); break;
    case 'maximize': win.isMaximized() ? win.unmaximize() : win.maximize(); break;
    case 'close': win.close(); break;
  }
});

// --- Execution Layer IPC Handlers ---

// Set permissions from the client consent screen
ipcMain.handle('execution-set-permissions', async (_, permissions) => {
  executionState.permissions = permissions;
  logAuditEntry({
    actionType: 'PERMISSIONS_SET',
    details: permissions,
    status: 'EXECUTED',
  });
  return { success: true };
});

// Execute an agentic action (from Helper side or AI)
ipcMain.handle('execution-execute-action', async (_, action) => {
  // Security Layer Check
  if (action.type !== 'READ' && !executionState.permissions.canControl) {
    logAuditEntry({
      actionType: 'EXECUTION_' + action.type,
      details: action,
      status: 'BLOCKED',
    });
    throw new Error('Permission denied: Remote control not enabled');
  }

  if (action.type !== 'WAIT' && action.type !== 'READ' && !executionState.permissions.canAutomate) {
    logAuditEntry({
      actionType: 'EXECUTION_' + action.type,
      details: action,
      status: 'BLOCKED',
    });
    throw new Error('Permission denied: AI automation not enabled');
  }

  logAuditEntry({
    actionType: 'EXECUTION_' + action.type,
    details: action,
    status: 'REQUESTED',
  });

  // Execution Layer Logic
  try {
    switch (action.type) {
      case 'CLICK':
        await mouse.setPosition({ x: action.x, y: action.y });
        await new Promise(r => setTimeout(r, 100));
        const clickBtn = action.button === 'right' ? Button.RIGHT : Button.LEFT;
        const clickCount = action.clickCount || 1;
        for (let i = 0; i < clickCount; i++) {
          await mouse.click(clickBtn);
          if (i < clickCount - 1) await new Promise(r => setTimeout(r, 100));
        }
        break;

      case 'TYPE':
        await keyboard.type(action.text);
        if (action.submit) {
          await new Promise(r => setTimeout(r, 200));
          await keyboard.pressKey(Key.Enter);
        }
        break;

      case 'SCROLL':
        const scrollAmount = action.amount || 100;
        const scrollDirection = action.direction === 'up' ? -1 : action.direction === 'down' ? 1 : 
                               action.direction === 'left' ? -1 : 1;
        await mouse.scrollVertical(scrollAmount * scrollDirection);
        break;

      case 'WAIT':
        await new Promise(r => setTimeout(r, action.durationMs));
        break;
    }

    logAuditEntry({
      actionType: 'EXECUTION_' + action.type,
      details: action,
      status: 'EXECUTED',
    });

    return { success: true };

  } catch (error) {
    logAuditEntry({
      actionType: 'EXECUTION_' + action.type,
      details: { action, error: String(error) },
      status: 'BLOCKED',
    });
    throw error;
  }
});

// Get audit log for debugging
ipcMain.handle('execution-get-audit-log', async () => {
  return executionState.auditLog;
});
