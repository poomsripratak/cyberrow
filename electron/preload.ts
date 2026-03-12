import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export interface MetricsUpdate {
  type: string;
  timestamp: number;
  session?: {
    elapsed_time: number;
    distance: number;
    calories: number;
  };
  current?: {
    stroke_rate: number;
    power: number;
    split_500m: number;
    drive_recovery_ratio: number;
  };
  stroke_analysis?: {
    stroke_length: number;
    peak_force: number;
    smoothness: number;
    symmetry: number;
    trunk_stability: number;
    seat_stability: number;
  };
}

export interface Command {
  type: 'command';
  action: 'start_session' | 'pause_session' | 'stop_session' | 'get_history';
}

export interface CyberRowAPI {
  sendCommand: (command: Command) => Promise<unknown>;
  getHistory: () => Promise<unknown>;
  toggleFullscreen: () => Promise<void>;
  quitApp: () => Promise<void>;
  onMetricsUpdate: (callback: (data: MetricsUpdate) => void) => () => void;
}

const api: CyberRowAPI = {
  // Send command to Python backend
  sendCommand: (command: Command) => ipcRenderer.invoke('send-command', command),

  // Get session history
  getHistory: () => ipcRenderer.invoke('get-history'),

  // Toggle fullscreen mode
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),

  // Quit the application
  quitApp: () => ipcRenderer.invoke('quit-app'),

  // Subscribe to real-time metrics updates
  onMetricsUpdate: (callback: (data: MetricsUpdate) => void) => {
    const handler = (_event: IpcRendererEvent, data: MetricsUpdate) => callback(data);
    ipcRenderer.on('metrics-update', handler);

    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener('metrics-update', handler);
    };
  },
};

contextBridge.exposeInMainWorld('cyberRow', api);

// Type declaration for use in renderer
declare global {
  interface Window {
    cyberRow: CyberRowAPI;
  }
}
