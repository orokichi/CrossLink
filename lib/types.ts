export interface DeviceStatus {
  connected: boolean;
  deviceName: string;
  model: string;
  batteryLevel: number;
  isCharging: boolean;
  networkType: 'wifi' | 'cellular' | 'offline';
  wifiSsid?: string;
  lastSeen: number;
}

export interface ClipboardItem {
  id: string;
  text: string;
  source: 'phone' | 'web';
  timestamp: number;
}

export interface SharedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  source: 'phone' | 'web';
  downloadUrl: string;
  timestamp: number;
}

export interface PhoneNotification {
  id: string;
  packageName: string;
  appName: string;
  title: string;
  text: string;
  timestamp: number;
  icon?: string;
}

export interface MediaState {
  title: string;
  artist: string;
  album?: string;
  isPlaying: boolean;
  positionMs?: number;
  durationMs?: number;
}

/**
 * A photo that lives in the phone's media library and is synced to the web session.
 * `clientId` is the phone-side identity (MediaStore id + date modified) used to skip
 * photos that were already uploaded.
 */
export interface PhotoMeta {
  id: string;
  name: string;
  size: number;
  type: string;
  width?: number;
  height?: number;
  source: 'phone' | 'web';
  takenAt: number;
  clientId?: string;
  url: string;
  timestamp: number;
}

export type CrossLinkMessage =
  | { type: 'device_status'; data: Partial<DeviceStatus> }
  | { type: 'clipboard_sync'; data: { text: string; source: 'phone' | 'web' } }
  | { type: 'file_shared'; data: SharedFile }
  | { type: 'notification_posted'; data: PhoneNotification }
  | { type: 'notification_removed'; data: { id: string } }
  | { type: 'media_state'; data: MediaState }
  | { type: 'media_control'; data: { action: 'play' | 'pause' | 'next' | 'prev' } }
  | { type: 'ring_phone'; data: { enabled: boolean } }
  | { type: 'photo_added'; data: PhotoMeta }
  | { type: 'photo_removed'; data: { id: string } }
  | { type: 'ping'; data: { timestamp: number } };
