import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as zmq from 'zeromq';

let mainWindow: BrowserWindow | null = null;
let subSocket: zmq.Subscriber | null = null;
let reqSocket: zmq.Request | null = null;
let isKioskMode = process.argv.includes('--kiosk');

// Queue for serializing REQ socket operations
let commandQueue: Promise<object | null> = Promise.resolve(null);

const BACKEND_PUB_ADDRESS = 'tcp://127.0.0.1:5555';
const BACKEND_REP_ADDRESS = 'tcp://127.0.0.1:5556';

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: isKioskMode,
    kiosk: isKioskMode,
    frame: !isKioskMode,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // Prevent throttling when window loses focus
    },
  });

  // In development, load from Vite dev server
  // In production, load from built files
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Initialize ZeroMQ connections
  await initializeZmq();
}

async function initializeZmq(): Promise<void> {
  try {
    // Subscribe socket for receiving metrics from backend
    subSocket = new zmq.Subscriber();
    subSocket.connect(BACKEND_PUB_ADDRESS);
    subSocket.subscribe('');
    console.log(`Subscribed to backend at ${BACKEND_PUB_ADDRESS}`);

    // Request socket for sending commands to backend
    reqSocket = new zmq.Request();
    reqSocket.connect(BACKEND_REP_ADDRESS);
    console.log(`Connected to backend command socket at ${BACKEND_REP_ADDRESS}`);

    // Start receiving messages
    receiveMetrics();
  } catch (error) {
    console.error('Failed to initialize ZeroMQ:', error);
  }
}

async function receiveMetrics(): Promise<void> {
  if (!subSocket) return;

  console.log('[ZMQ] Starting to receive metrics...');
  let messageCount = 0;
  let metricsUpdateCount = 0;
  let realtimeUpdateCount = 0;

  try {
    for await (const [msg] of subSocket) {
      messageCount++;
      const data = JSON.parse(msg.toString());

      // Track message types
      if (data.type === 'metrics_update') {
        metricsUpdateCount++;
        console.log(`[ZMQ] METRICS_UPDATE #${metricsUpdateCount} received:`, {
          hasSession: !!data.session,
          hasCurrent: !!data.current,
          hasStrokeAnalysis: !!data.stroke_analysis,
          strokeRate: data.current?.stroke_rate,
          power: data.current?.power,
          split500m: data.current?.split_500m,
        });
      } else if (data.type === 'realtime_update') {
        realtimeUpdateCount++;
        // Only log every 100th realtime update to reduce noise
        if (realtimeUpdateCount % 100 === 1) {
          console.log(`[ZMQ] realtime_update #${realtimeUpdateCount}, elapsed: ${data.session?.elapsed_time?.toFixed(1)}s`);
        }
      } else if (data.type === 'session_status') {
        console.log(`[ZMQ] SESSION_STATUS:`, data.status);
      } else if (messageCount === 1) {
        console.log(`[ZMQ] First message received, type: ${data.type || 'unknown'}`);
      }

      // Forward to renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('metrics-update', data);
      }
    }
  } catch (error) {
    console.error('[ZMQ] Error receiving metrics:', error);
  }
}

async function sendCommandInternal(command: object): Promise<object | null> {
  if (!reqSocket) {
    console.error('[ZMQ] REQ socket not initialized');
    return null;
  }

  try {
    const cmdObj = command as { action?: string };
    console.log(`[ZMQ] Sending command: ${cmdObj.action || 'unknown'}`);
    await reqSocket.send(JSON.stringify(command));
    const [response] = await reqSocket.receive();
    const result = JSON.parse(response.toString());
    const resultObj = result as { status?: string };
    console.log(`[ZMQ] Response: ${resultObj.status || 'ok'}`);
    return result;
  } catch (error) {
    console.error('[ZMQ] Error sending command:', error);
    return null;
  }
}

// Serialize commands through a queue to avoid EBUSY errors
function sendCommand(command: object): Promise<object | null> {
  commandQueue = commandQueue.then(() => sendCommandInternal(command));
  return commandQueue;
}

// IPC handlers for renderer communication
ipcMain.handle('send-command', async (_event, command: object) => {
  return await sendCommand(command);
});

ipcMain.handle('get-history', async () => {
  return await sendCommand({ type: 'command', action: 'get_history' });
});

ipcMain.handle('toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

ipcMain.handle('quit-app', () => {
  app.quit();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', async () => {
  // Clean up ZeroMQ sockets
  if (subSocket) {
    subSocket.close();
  }
  if (reqSocket) {
    reqSocket.close();
  }
});

// Keyboard shortcuts
app.on('ready', () => {
  // ESC to exit kiosk mode (for development)
  if (mainWindow) {
    mainWindow.webContents.on('before-input-event', (_event, input) => {
      if (input.key === 'Escape' && isKioskMode) {
        mainWindow?.setKiosk(false);
        mainWindow?.setFullScreen(false);
      }
      // Ctrl+Shift+D to toggle DevTools
      if (input.control && input.shift && input.key === 'D') {
        mainWindow?.webContents.toggleDevTools();
      }
    });
  }
});
