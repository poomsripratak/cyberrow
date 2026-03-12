import type { Command, Session, UpdateData } from './metrics';

interface CyberRowAPI {
  sendCommand: (command: Command) => Promise<{ status: string; [key: string]: unknown }>;
  onMetricsUpdate: (callback: (data: UpdateData) => void) => () => void;
  getHistory: () => Promise<{ sessions: Session[] }>;
}

declare global {
  interface Window {
    cyberRow?: CyberRowAPI;
    __sessionStore?: unknown;
  }
}

export {};
