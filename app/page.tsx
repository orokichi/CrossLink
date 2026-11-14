'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import DeviceHeader from '@/components/DeviceHeader';
import ClipboardSection from '@/components/ClipboardSection';
import FileTransferSection from '@/components/FileTransferSection';
import NotificationSection from '@/components/NotificationSection';
import MediaSection from '@/components/MediaSection';
import PairingModal from '@/components/PairingModal';
import PhotoGallery from '@/components/PhotoGallery';
import OnboardingWizard from '@/components/OnboardingWizard';
import SettingsSheet from '@/components/SettingsSheet';
import {
  DeviceStatus,
  ClipboardItem,
  SharedFile,
  PhoneNotification,
  MediaState,
} from '@/lib/types';

type Tab = 'all' | 'clipboard' | 'files' | 'notifications' | 'photos';
type PermissionState = NotificationPermission | 'unsupported';

const ONBOARDING_KEY = 'crosslink_onboarded_v1';
const CODE_KEY = 'crosslink_code';

function readNotificationPermission(): PermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string>('');
  const [pairingCode, setPairingCode] = useState<string>('');
  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingReopen, setOnboardingReopen] = useState(false);
  const [photoRefresh, setPhotoRefresh] = useState(0);
  const [photosCount, setPhotosCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState<PermissionState>('unsupported');

  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({
    connected: false,
    deviceName: 'Pixel 9a',
    model: 'Google Pixel 9a',
    batteryLevel: 88,
    isCharging: false,
    networkType: 'wifi',
    wifiSsid: 'Home-Wi-Fi_5G',
    lastSeen: Date.now(),
  });

  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>([]);
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [notifications, setNotifications] = useState<PhoneNotification[]>([]);
  const [mediaState, setMediaState] = useState<MediaState | null>({
    title: 'Subtitle',
    artist: 'Official髭男dism',
    album: 'Rejoice',
    isPlaying: true,
  });
  const [autoSync, setAutoSync] = useState(true);
  const [isRinging, setIsRinging] = useState(false);

  const lastTimestampRef = useRef<number>(0);
  const sessionReadyRef = useRef(false);

  // Initialize or restore session (honours ?code= from a shared pairing link)
  useEffect(() => {
    let savedCode = '';
    if (typeof window !== 'undefined') {
      savedCode = localStorage.getItem(CODE_KEY) || '';

      const params = new URLSearchParams(window.location.search);
      const queryCode = params.get('code');
      if (queryCode && /^\d{6}$/.test(queryCode)) {
        savedCode = queryCode;
        localStorage.setItem(CODE_KEY, queryCode);
        // Clean the code out of the address bar but keep any tab deep link.
        params.delete('code');
        const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
        window.history.replaceState({}, '', next);
      }

      const tab = params.get('tab') as Tab | null;
      if (tab && ['all', 'clipboard', 'files', 'notifications', 'photos'].includes(tab)) {
        setActiveTab(tab);
      }
    }

    setNotificationPermission(readNotificationPermission());

    fetch('/api/session/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: savedCode || undefined }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setSessionId(data.sessionId);
          setPairingCode(data.code);
          sessionReadyRef.current = true;
          if (typeof window !== 'undefined') {
            localStorage.setItem(CODE_KEY, data.code);
            const seen = localStorage.getItem(ONBOARDING_KEY);
            if (!seen) {
              setOnboardingReopen(false);
              setOnboardingOpen(true);
            }
          }
        }
      })
      .catch((err) => console.error('Failed to init session', err));
  }, []);

  // Keep the notification permission in sync when the user changes browser settings.
  useEffect(() => {
    const refresh = () => setNotificationPermission(readNotificationPermission());
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  // Polling loop for events
  useEffect(() => {
    if (!sessionId) return;

    let isMounted = true;
    const pollEvents = async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}/events?since=${lastTimestampRef.current}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        if (data.deviceStatus) {
          setDeviceStatus(data.deviceStatus);
        }

        if (data.messages && data.messages.length > 0) {
          for (const entry of data.messages) {
            const { message, timestamp } = entry;
            if (timestamp > lastTimestampRef.current) {
              lastTimestampRef.current = timestamp;
            }

            if (message.type === 'clipboard_sync') {
              const newItem: ClipboardItem = {
                id: Math.random().toString(36).substring(2, 9),
                text: message.data.text,
                source: message.data.source,
                timestamp,
              };
              setClipboardItems((prev) => [newItem, ...prev.slice(0, 49)]);

              if (autoSync && message.data.source === 'phone') {
                try {
                  navigator.clipboard.writeText(message.data.text);
                } catch {
                  // Ignore clipboard write error if not focused
                }
              }
            } else if (message.type === 'file_shared') {
              setSharedFiles((prev) => [message.data, ...prev]);
            } else if (message.type === 'notification_posted') {
              setNotifications((prev) => [
                message.data,
                ...prev.filter((n) => n.id !== message.data.id),
              ]);

              // Mirror the phone notification into the browser when the tab is in the background.
              if (
                typeof window !== 'undefined' &&
                'Notification' in window &&
                Notification.permission === 'granted' &&
                document.visibilityState === 'hidden'
              ) {
                try {
                  new Notification(message.data.title || message.data.appName || 'CrossLink', {
                    body: message.data.text,
                    tag: message.data.id,
                    icon: '/icons/icon-192.png',
                  });
                } catch {
                  /* some browsers require a service worker for notifications */
                }
              }
            } else if (message.type === 'notification_removed') {
              setNotifications((prev) => prev.filter((n) => n.id !== message.data.id));
            } else if (message.type === 'media_state') {
              setMediaState(message.data);
            } else if (message.type === 'photo_added' || message.type === 'photo_removed') {
              setPhotoRefresh((n) => n + 1);
            }
          }
        }
      } catch (e) {
        console.warn('Poll error:', e);
      }
    };

    const interval = setInterval(pollEvents, 1200);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionId, autoSync]);

  const handleSendText = async (text: string) => {
    if (!sessionId) return;
    const newItem: ClipboardItem = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      source: 'web',
      timestamp: Date.now(),
    };
    setClipboardItems((prev) => [newItem, ...prev]);

    await fetch(`/api/session/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'clipboard_sync',
        data: { text, source: 'web' },
      }),
    });
  };

  const handleUploadFile = async (file: File) => {
    if (!sessionId) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source', 'web');

    const res = await fetch(`/api/session/${sessionId}/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (data.ok && data.file) {
      setSharedFiles((prev) => [data.file, ...prev]);
    }
  };

  const handleMediaControl = async (action: 'play' | 'pause' | 'next' | 'prev') => {
    if (!sessionId) return;
    if (mediaState) {
      if (action === 'play') setMediaState({ ...mediaState, isPlaying: true });
      if (action === 'pause') setMediaState({ ...mediaState, isPlaying: false });
    }
    await fetch(`/api/session/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'media_control',
        data: { action },
      }),
    });
  };

  const handleRingPhone = async () => {
    if (!sessionId) return;
    setIsRinging(true);
    await fetch(`/api/session/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'ring_phone',
        data: { enabled: true },
      }),
    });
    setTimeout(() => setIsRinging(false), 5000);
  };

  const handleNewCode = async () => {
    const res = await fetch('/api/session/create', { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      setSessionId(data.sessionId);
      setPairingCode(data.code);
      lastTimestampRef.current = 0;
      setPhotoRefresh((n) => n + 1);
      if (typeof window !== 'undefined') {
        localStorage.setItem(CODE_KEY, data.code);
      }
    }
  };

  const requestNotifications = useCallback(async (): Promise<PermissionState> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return 'unsupported';
    }
    try {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
      return result;
    } catch {
      const current = readNotificationPermission();
      setNotificationPermission(current);
      return current;
    }
  }, []);

  const finishOnboarding = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_KEY, new Date().toISOString());
    }
    setOnboardingOpen(false);
    setOnboardingReopen(false);
  }, []);

  const closeOnboarding = useCallback(() => {
    finishOnboarding();
  }, [finishOnboarding]);

  const openOnboardingFromSettings = useCallback(() => {
    setSettingsOpen(false);
    setOnboardingReopen(true);
    setOnboardingOpen(true);
  }, []);

  const openPhotos = useCallback(() => {
    setActiveTab('photos');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const onPhotoCount = useCallback((count: number) => setPhotosCount(count), []);

  return (
    <main className="main-container">
      <div className="app-shell">
        {/* Top Branding Bar */}
        <div className="top-brand-bar">
          <div className="brand-logo">
            <div className="brand-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <span className="brand-title">CrossLink</span>
            <span className="brand-subtitle">Phone Link for Web</span>
          </div>

          <div className="top-actions">
            <div className="nav-tabs">
              <button
                className={`nav-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                ダッシュボード
              </button>
              <button
                className={`nav-tab-btn ${activeTab === 'clipboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('clipboard')}
              >
                クリップボード
              </button>
              <button
                className={`nav-tab-btn ${activeTab === 'files' ? 'active' : ''}`}
                onClick={() => setActiveTab('files')}
              >
                ファイル共有
              </button>
              <button
                className={`nav-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
                onClick={() => setActiveTab('notifications')}
              >
                通知 ({notifications.length})
              </button>
              <button
                className={`nav-tab-btn ${activeTab === 'photos' ? 'active' : ''}`}
                onClick={() => setActiveTab('photos')}
              >
                写真{photosCount > 0 ? ` (${photosCount})` : ''}
              </button>
            </div>

            <button className="settings-btn" onClick={() => setSettingsOpen(true)} aria-label="設定" title="設定">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Device Status Header */}
        <DeviceHeader
          status={deviceStatus}
          code={pairingCode}
          onOpenPairing={() => setIsPairingOpen(true)}
          onRingPhone={handleRingPhone}
          isRinging={isRinging}
        />

        {/* Now Playing Media Bar */}
        <MediaSection media={mediaState} onControl={handleMediaControl} />

        {/* Main Content Grid */}
        {activeTab === 'photos' ? (
          <div className="photos-wrap">
            <PhotoGallery
              sessionId={sessionId}
              refreshToken={photoRefresh}
              connected={deviceStatus.connected}
              onCountChange={onPhotoCount}
              onOpenPairing={() => setIsPairingOpen(true)}
            />
          </div>
        ) : (
          <div className="content-grid">
            {(activeTab === 'all' || activeTab === 'clipboard') && (
              <div className="grid-column">
                <ClipboardSection
                  items={clipboardItems}
                  onSendText={handleSendText}
                  autoSync={autoSync}
                  onToggleAutoSync={() => setAutoSync(!autoSync)}
                />
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'files') && (
              <div className="grid-column">
                <FileTransferSection
                  files={sharedFiles}
                  onUploadFile={handleUploadFile}
                />
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'notifications') && (
              <div className="grid-column">
                <NotificationSection
                  notifications={notifications}
                  onClearAll={() => setNotifications([])}
                  onDismiss={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <PairingModal
        code={pairingCode}
        isOpen={isPairingOpen}
        onClose={() => setIsPairingOpen(false)}
        onNewCode={handleNewCode}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        code={pairingCode}
        connected={deviceStatus.connected}
        deviceName={deviceStatus.deviceName}
        photosCount={photosCount}
        notificationPermission={notificationPermission}
        onRequestNotifications={requestNotifications}
        onOpenOnboarding={openOnboardingFromSettings}
        onNewCode={handleNewCode}
        onOpenPhotos={() => {
          setSettingsOpen(false);
          openPhotos();
        }}
      />

      <OnboardingWizard
        open={onboardingOpen}
        reopen={onboardingReopen}
        code={pairingCode}
        notificationPermission={notificationPermission}
        onRequestNotifications={requestNotifications}
        onNewCode={handleNewCode}
        onOpenPhotos={openPhotos}
        onFinish={finishOnboarding}
        onClose={closeOnboarding}
      />

      <style jsx>{`
        .main-container {
          flex: 1;
          padding: 24px 20px;
          max-width: 1240px;
          margin: 0 auto;
          width: 100%;
        }
        .app-shell {
          display: flex;
          flex-direction: column;
        }
        .top-brand-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 20px;
        }
        .brand-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .brand-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          background-color: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .brand-title {
          font-size: 1.4rem;
          font-weight: 800;
          letter-spacing: -0.03em;
        }
        .brand-subtitle {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--md-sys-color-on-surface-variant);
          padding-left: 4px;
        }
        .top-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .nav-tabs {
          display: flex;
          background-color: var(--md-sys-color-surface-container);
          padding: 4px;
          border-radius: var(--radius-full);
          gap: 4px;
          overflow-x: auto;
          max-width: 100%;
        }
        .nav-tab-btn {
          padding: 8px 16px;
          border-radius: var(--radius-full);
          border: none;
          background: transparent;
          font-size: 0.86rem;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant);
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .nav-tab-btn:hover {
          color: var(--md-sys-color-on-surface);
        }
        .nav-tab-btn.active {
          background-color: var(--md-sys-color-surface-container-lowest);
          color: var(--md-sys-color-primary);
          box-shadow: var(--shadow-1);
        }
        .settings-btn {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          border-radius: var(--radius-full);
          border: none;
          background-color: var(--md-sys-color-surface-container);
          color: var(--md-sys-color-on-surface-variant);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        .settings-btn:hover {
          background-color: var(--md-sys-color-surface-container-high);
          color: var(--md-sys-color-primary);
        }
        .content-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 24px;
          align-items: start;
        }
        .grid-column {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .photos-wrap {
          display: flex;
          flex-direction: column;
        }
        @media (max-width: 840px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
          .top-actions {
            width: 100%;
          }
          .nav-tabs {
            flex: 1;
          }
        }
        @media (max-width: 560px) {
          .main-container {
            padding: 16px 14px 28px;
          }
          .brand-subtitle {
            display: none;
          }
          .nav-tab-btn {
            padding: 7px 12px;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </main>
  );
}
