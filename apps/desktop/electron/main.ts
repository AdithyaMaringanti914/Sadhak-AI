import { app, BrowserWindow, ipcMain, screen as electronScreen } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { mouse, keyboard, Button, Key, screen } from '@computer-use/nut-js';

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

// --- IPC Handlers for Remote Control ---

ipcMain.handle('mouse-move', async (_, { x, y }) => {
  await mouse.setPosition({ x, y });
});

ipcMain.handle('mouse-click', async (_, { button = 'left' }) => {
  const btn = button === 'right' ? Button.RIGHT : Button.LEFT;
  await mouse.click(btn);
});

ipcMain.handle('keyboard-type', async (_, { text }) => {
  await keyboard.type(text);
});

ipcMain.handle('keyboard-press', async (_, { key }) => {
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
