'use client';

import React, { useState } from 'react';
import PwaInstallButton from '@/components/PwaInstall';

type PermissionState = NotificationPermission | 'unsupported';

interface Props {
  open: boolean;
  onClose: () => void;
  code: string;
  connected: boolean;
  deviceName: string;
  photosCount: number;
  notificationPermission: PermissionState;
  onRequestNotifications: () => Promise<PermissionState>;
  onOpenOnboarding: () => void;
  onNewCode: () => void;
  onOpenPhotos: () => void;
}

function permissionLabel(state: PermissionState): string {
  if (state === 'granted') return '許可済み';
  if (state === 'denied') return 'ブロック中';
  if (state === 'default') return '未設定';
  return '非対応';
}

export default function SettingsSheet({
  open,
  onClose,
  code,
  connected,
  deviceName,
  photosCount,
  notificationPermission,
  onRequestNotifications,
  onOpenOnboarding,
  onNewCode,
  onOpenPhotos,
}: Props) {
  const [permission, setPermission] = useState<PermissionState>(notificationPermission);
  const [copied, setCopied] = useState(false);
  const [testSent, setTestSent] = useState(false);

  React.useEffect(() => {
    if (open) setPermission(notificationPermission);
  }, [open, notificationPermission]);

  if (!open) return null;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const requestPermission = async () => {
    const result = await onRequestNotifications();
    setPermission(result);
  };

  const sendTest = async () => {
    if (permission !== 'granted') return;
    try {
      new Notification('CrossLink', {
        body: '通知のテストです。スマートフォンに届いた通知は、このように表示されます。',
        icon: '/icons/icon-192.png',
        tag: 'crosslink-test',
      });
      setTestSent(true);
      window.setTimeout(() => setTestSent(false), 2500);
    } catch {
      setTestSent(false);
    }
  };

  return (
    <div className="settings-backdrop" onClick={onClose}>
      <div
        className="settings-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="設定"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-head">
          <h2>設定</h2>
          <button className="settings-close" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </div>

        <div className="settings-body">
          <section className="settings-group">
            <h3 className="settings-group-title">はじめに</h3>
            <button className="settings-row settings-row-btn" onClick={onOpenOnboarding}>
              <span className="settings-row-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
                </svg>
              </span>
              <span className="settings-row-text">
                <strong>初期設定をやり直す</strong>
                <small>ペアリング・通知・写真・チュートリアル</small>
              </span>
              <span className="settings-chevron">›</span>
            </button>

            <div className="settings-row">
              <span className="settings-row-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="M7 10l5 5 5-5" />
                  <path d="M12 15V3" />
                </svg>
              </span>
              <span className="settings-row-text">
                <strong>アプリとしてインストール</strong>
                <small>ホーム画面から直接起動できます</small>
              </span>
              <PwaInstallButton className="m3-btn m3-btn-tonal settings-small-btn" label="インストール" />
            </div>
          </section>

          <section className="settings-group">
            <h3 className="settings-group-title">通知</h3>
            <div className="settings-row">
              <span className="settings-row-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              </span>
              <span className="settings-row-text">
                <strong>ブラウザ通知</strong>
                <small>スマートフォンの通知をミラーリング</small>
              </span>
              <span className={`settings-pill ${permission === 'granted' ? 'ok' : permission === 'denied' ? 'ng' : ''}`}>
                {permissionLabel(permission)}
              </span>
            </div>

            <div className="settings-inline-actions">
              {permission === 'default' && (
                <button className="m3-btn m3-btn-tonal settings-small-btn" onClick={requestPermission}>
                  通知を許可する
                </button>
              )}
              {permission === 'granted' && (
                <button className="m3-btn m3-btn-outlined settings-small-btn" onClick={sendTest}>
                  {testSent ? 'テスト送信しました' : '通知をテスト'}
                </button>
              )}
              {permission === 'denied' && (
                <span className="settings-hint">ブラウザのサイト設定から通知を許可してください。</span>
              )}
            </div>
          </section>

          <section className="settings-group">
            <h3 className="settings-group-title">ペアリング</h3>
            <div className="settings-row">
              <span className="settings-row-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M7 7h.01M17 7h.01M7 17h.01M17 17h.01" />
                </svg>
              </span>
              <span className="settings-row-text">
                <strong>ペアリングコード</strong>
                <small>
                  {connected ? `${deviceName} と接続中` : 'スマートフォンは未接続'}
                </small>
              </span>
              <span className="settings-code">{code || '------'}</span>
            </div>
            <div className="settings-inline-actions">
              <button className="m3-btn m3-btn-outlined settings-small-btn" onClick={copyCode}>
                {copied ? 'コピーしました' : 'コードをコピー'}
              </button>
              <button className="m3-btn m3-btn-tonal settings-small-btn" onClick={onNewCode}>
                新しいコードを生成
              </button>
            </div>
          </section>

          <section className="settings-group">
            <h3 className="settings-group-title">写真</h3>
            <button className="settings-row settings-row-btn" onClick={onOpenPhotos}>
              <span className="settings-row-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect width="18" height="18" x="3" y="3" rx="3" />
                  <circle cx="9" cy="9" r="1.6" />
                  <path d="M21 15l-4.5-4.5L6 21" />
                </svg>
              </span>
              <span className="settings-row-text">
                <strong>写真ライブラリを開く</strong>
                <small>同期済み {photosCount} 枚</small>
              </span>
              <span className="settings-chevron">›</span>
            </button>
          </section>

          <p className="settings-foot">CrossLink · Phone Link for Web · v1.1.0</p>
        </div>
      </div>

      <style jsx>{`
        .settings-backdrop {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 1250;
          padding: 0;
        }
        .settings-sheet {
          width: 100%;
          max-width: 560px;
          max-height: 88vh;
          background-color: var(--md-sys-color-surface-container-lowest);
          border-radius: var(--radius-xl) var(--radius-xl) 0 0;
          box-shadow: var(--shadow-3);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: settings-up 0.28s cubic-bezier(0.2, 0, 0, 1);
        }
        @keyframes settings-up {
          from {
            transform: translateY(24px);
            opacity: 0.6;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @media (min-width: 640px) {
          .settings-backdrop {
            align-items: center;
            padding: 20px;
          }
          .settings-sheet {
            border-radius: var(--radius-xl);
          }
        }
        .settings-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 22px 8px;
        }
        .settings-head h2 {
          font-size: 1.2rem;
          font-weight: 800;
        }
        .settings-close {
          background: transparent;
          border: none;
          color: var(--md-sys-color-outline);
          font-size: 1.05rem;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: var(--radius-full);
        }
        .settings-close:hover {
          background-color: var(--md-sys-color-surface-container-high);
          color: var(--md-sys-color-on-surface);
        }
        .settings-body {
          padding: 8px 22px 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .settings-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .settings-group-title {
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          color: var(--md-sys-color-primary);
          text-transform: uppercase;
        }
        .settings-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: var(--radius-md);
          background-color: var(--md-sys-color-surface-container-low);
          border: 1px solid transparent;
          width: 100%;
          text-align: left;
        }
        .settings-row-btn {
          cursor: pointer;
          font: inherit;
          color: inherit;
          transition: background-color 0.2s ease, transform 0.15s ease;
        }
        .settings-row-btn:hover {
          background-color: var(--md-sys-color-surface-container-high);
        }
        .settings-row-btn:active {
          transform: scale(0.995);
        }
        .settings-row-icon {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background-color: var(--md-sys-color-surface-container-highest);
          color: var(--md-sys-color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .settings-row-text {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
          flex: 1;
        }
        .settings-row-text strong {
          font-size: 0.9rem;
          font-weight: 700;
        }
        .settings-row-text small {
          font-size: 0.76rem;
          color: var(--md-sys-color-on-surface-variant);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .settings-chevron {
          color: var(--md-sys-color-outline);
          font-size: 1.1rem;
        }
        .settings-code {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 1rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: var(--md-sys-color-primary);
        }
        .settings-pill {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          background-color: var(--md-sys-color-surface-container-highest);
          color: var(--md-sys-color-on-surface-variant);
          flex-shrink: 0;
        }
        .settings-pill.ok {
          background-color: rgba(46, 125, 50, 0.14);
          color: #2e7d32;
        }
        .settings-pill.ng {
          background-color: var(--md-sys-color-error-container);
          color: var(--md-sys-color-on-error-container);
        }
        .settings-inline-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          padding-left: 44px;
        }
        .settings-small-btn {
          padding: 7px 14px;
          font-size: 0.8rem;
        }
        .settings-hint {
          font-size: 0.76rem;
          color: var(--md-sys-color-on-surface-variant);
        }
        .settings-foot {
          font-size: 0.72rem;
          text-align: center;
          color: var(--md-sys-color-on-surface-variant);
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}
