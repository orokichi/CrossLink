import { DeviceStatus, CrossLinkMessage, SharedFile, PhotoMeta } from './types';

export const MAX_PHOTOS_PER_SESSION = 60;
export const MAX_PHOTOS_BYTES_PER_SESSION = 240 * 1024 * 1024; // 240 MB
export const MAX_SINGLE_PHOTO_BYTES = 9 * 1024 * 1024; // 9 MB (Vercel body limit is 4.5 MB per request)

interface SessionData {
  id: string;
  code: string;
  createdAt: number;
  lastActive: number;
  deviceStatus: DeviceStatus;
  messages: Array<{ id: string; message: CrossLinkMessage; timestamp: number }>;
  files: Map<string, { meta: SharedFile; data: Uint8Array }>;
  photos: Map<string, { meta: PhotoMeta; data: Uint8Array }>;
}

declare global {
  // eslint-disable-next-line no-var
  var __crosslink_sessions: Map<string, SessionData> | undefined;
}

const sessions = globalThis.__crosslink_sessions ?? (globalThis.__crosslink_sessions = new Map<string, SessionData>());

function newSession(code: string): SessionData {
  return {
    id: code,
    code,
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
    photos: new Map(),
  };
}

/**
 * Returns the session for a pairing code, creating it when it does not exist yet.
 * Re-pairing an existing code must never wipe the photos and messages already synced,
 * so an existing session is returned untouched.
 */
export function createSession(code?: string): SessionData {
  const generatedCode = code || Math.floor(100000 + Math.random() * 900000).toString();
  const existing = sessions.get(generatedCode);
  if (existing) {
    existing.lastActive = Date.now();
    return existing;
  }
  const session = newSession(generatedCode);
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

export function listPhotos(sessionId: string): PhotoMeta[] {
  const session = getSession(sessionId);
  if (!session) return [];
  return Array.from(session.photos.values())
    .map((p) => p.meta)
    .sort((a, b) => (b.takenAt || b.timestamp) - (a.takenAt || a.timestamp));
}

export function photoUsage(sessionId: string): { count: number; bytes: number } {
  const session = getSession(sessionId);
  if (!session) return { count: 0, bytes: 0 };
  let bytes = 0;
  session.photos.forEach((p) => {
    bytes += p.data.byteLength;
  });
  return { count: session.photos.size, bytes };
}

export function findPhotoByClientId(sessionId: string, clientId: string): PhotoMeta | undefined {
  const session = getSession(sessionId);
  if (!session || !clientId) return undefined;
  for (const entry of session.photos.values()) {
    if (entry.meta.clientId === clientId) return entry.meta;
  }
  return undefined;
}

export function storePhoto(
  sessionId: string,
  photoId: string,
  meta: PhotoMeta,
  data: Uint8Array
): { ok: boolean; error?: string } {
  const session = getSession(sessionId);
  if (!session) return { ok: false, error: 'Session not found' };

  if (data.byteLength > MAX_SINGLE_PHOTO_BYTES) {
    return { ok: false, error: 'Photo is too large' };
  }
  if (session.photos.size >= MAX_PHOTOS_PER_SESSION) {
    return { ok: false, error: 'Photo storage for this session is full' };
  }
  const usage = photoUsage(sessionId);
  if (usage.bytes + data.byteLength > MAX_PHOTOS_BYTES_PER_SESSION) {
    return { ok: false, error: 'Photo storage for this session is full' };
  }

  session.lastActive = Date.now();
  session.photos.set(photoId, { meta, data });
  pushMessage(sessionId, { type: 'photo_added', data: meta });
  return { ok: true };
}

export function getStoredPhoto(sessionId: string, photoId: string) {
  const session = getSession(sessionId);
  if (!session) return undefined;
  return session.photos.get(photoId);
}

export function removePhoto(sessionId: string, photoId: string): boolean {
  const session = getSession(sessionId);
  if (!session) return false;
  const existed = session.photos.delete(photoId);
  if (existed) {
    pushMessage(sessionId, { type: 'photo_removed', data: { id: photoId } });
  }
  return existed;
}
