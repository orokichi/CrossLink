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

export type CrossLinkMessage =
  | { type: 'device_status'; data: Partial<DeviceStatus> }
  | { type: 'clipboard_sync'; data: { text: string; source: 'phone' | 'web' } }
  | { type: 'file_shared'; data: SharedFile }
  | { type: 'notification_posted'; data: PhoneNotification }
  | { type: 'notification_removed'; data: { id: string } }
  | { type: 'media_state'; data: MediaState }
  | { type: 'media_control'; data: { action: 'play' | 'pause' | 'next' | 'prev' } }
  | { type: 'ring_phone'; data: { enabled: boolean } }
  | { type: 'ping'; data: { timestamp: number } };
