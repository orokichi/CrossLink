import { DeviceStatus, CrossLinkMessage, SharedFile } from './types';

interface SessionData {
  id: string;
  code: string;
  createdAt: number;
  lastActive: number;
  deviceStatus: DeviceStatus;
  messages: Array<{ id: string; message: CrossLinkMessage; timestamp: number }>;
  files: Map<string, { meta: SharedFile; data: Uint8Array }>;
}

declare global {
  // eslint-disable-next-line no-var
  var __crosslink_sessions: Map<string, SessionData> | undefined;
}

const sessions = globalThis.__crosslink_sessions ?? (globalThis.__crosslink_sessions = new Map<string, SessionData>());

export function createSession(code?: string): SessionData {
  const generatedCode = code || Math.floor(100000 + Math.random() * 900000).toString();
  const session: SessionData = {
    id: generatedCode,
    code: generatedCode,
    createdAt: Date.now(),
    lastActive: Date.now(),
    deviceStatus: {
      connected: false,
      deviceName: 'Pixel 9a',
      model: 'Google Pixel',
      batteryLevel: 100,
      isCharging: false,
      networkType: 'offline',
      lastSeen: 0,
    },
    messages: [],
    files: new Map(),
  };
  sessions.set(generatedCode, session);
  return session;
}

export function getSession(idOrCode: string): SessionData | undefined {
  return sessions.get(idOrCode);
}

export function pushMessage(sessionId: string, message: CrossLinkMessage): void {
  const session = getSession(sessionId);
  if (!session) return;
  session.lastActive = Date.now();

  if (message.type === 'device_status') {
    session.deviceStatus = { ...session.deviceStatus, ...message.data, lastSeen: Date.now(), connected: true };
  }

  const msgEntry = {
    id: Math.random().toString(36).substring(2, 9),
    message,
    timestamp: Date.now(),
  };
  session.messages.push(msgEntry);

  // Keep last 100 messages
  if (session.messages.length > 100) {
    session.messages.splice(0, session.messages.length - 100);
  }
}

export function getMessagesSince(sessionId: string, sinceTimestamp: number) {
  const session = getSession(sessionId);
  if (!session) return [];
  return session.messages.filter((m) => m.timestamp > sinceTimestamp);
}

export function storeFile(sessionId: string, fileId: string, meta: SharedFile, data: Uint8Array) {
  const session = getSession(sessionId);
  if (!session) return;
  session.files.set(fileId, { meta, data });
  pushMessage(sessionId, { type: 'file_shared', data: meta });
}

export function getStoredFile(sessionId: string, fileId: string) {
  const session = getSession(sessionId);
  if (!session) return undefined;
  return session.files.get(fileId);
}
