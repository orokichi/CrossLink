'use client';

import React, { useState, useEffect, useRef } from 'react';
import DeviceHeader from '@/components/DeviceHeader';
import ClipboardSection from '@/components/ClipboardSection';
import FileTransferSection from '@/components/FileTransferSection';
import NotificationSection from '@/components/NotificationSection';
import MediaSection from '@/components/MediaSection';
import PairingModal from '@/components/PairingModal';
import {
  DeviceStatus,
  ClipboardItem,
  SharedFile,
  PhoneNotification,
  MediaState,
} from '@/lib/types';

export default function Home() {
  const [sessionId, setSessionId] = useState<string>('');
  const [pairingCode, setPairingCode] = useState<string>('');
  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'clipboard' | 'files' | 'notifications'>('all');

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

  // Initialize or restore session
  useEffect(() => {
    let savedCode = '';
    if (typeof window !== 'undefined') {
      savedCode = localStorage.getItem('crosslink_code') || '';
    }

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
          if (typeof window !== 'undefined') {
            localStorage.setItem('crosslink_code', data.code);
          }
        }
      })
      .catch((err) => console.error('Failed to init session', err));
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
            } else if (message.type === 'notification_removed') {
              setNotifications((prev) => prev.filter((n) => n.id !== message.data.id));
            } else if (message.type === 'media_state') {
              setMediaState(message.data);
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
      if (typeof window !== 'undefined') {
        localStorage.setItem('crosslink_code', data.code);
      }
    }
  };

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
      </div>

      <PairingModal
        code={pairingCode}
        isOpen={isPairingOpen}
        onClose={() => setIsPairingOpen(false)}
        onNewCode={handleNewCode}
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
        .nav-tabs {
          display: flex;
          background-color: var(--md-sys-color-surface-container);
          padding: 4px;
          border-radius: var(--radius-full);
          gap: 4px;
        }
        .nav-tab-btn {
          padding: 8px 18px;
          border-radius: var(--radius-full);
          border: none;
          background: transparent;
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .nav-tab-btn:hover {
          color: var(--md-sys-color-on-surface);
        }
        .nav-tab-btn.active {
          background-color: var(--md-sys-color-surface-container-lowest);
          color: var(--md-sys-color-primary);
          box-shadow: var(--shadow-1);
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
        @media (max-width: 840px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
