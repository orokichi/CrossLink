'use client';

import React, { useCallback, useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export type InstallState = {
  /** The browser offered an install prompt we can trigger. */
  canPrompt: boolean;
  /** Running as an installed app right now. */
  isStandalone: boolean;
  /** iPhone / iPad (no beforeinstallprompt, manual "ホーム画面に追加" needed). */
  isIos: boolean;
  installed: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
};

export function usePwaInstall(): InstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = window.navigator.userAgent || '';
    const iosDevice = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document);
    setIsIos(iosDevice);

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    if (standalone) setInstalled(true);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return 'unavailable' as const;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === 'accepted') {
      setInstalled(true);
      return 'accepted' as const;
    }
    return 'dismissed' as const;
  }, [deferred]);

  return { canPrompt: Boolean(deferred), isStandalone, isIos, installed, promptInstall };
}

interface Props {
  className?: string;
  label?: string;
}

/**
 * PWA install entry point.
 * Uses beforeinstallprompt where the browser supports it, and falls back to a
 * short illustrated guide for iOS Safari and desktop browsers without a prompt.
 */
export default function PwaInstallButton({ className = 'm3-btn m3-btn-tonal', label }: Props) {
  const { canPrompt, isStandalone, isIos, installed, promptInstall } = usePwaInstall();
  const [guideOpen, setGuideOpen] = useState(false);

  const onClick = async () => {
    if (installed || isStandalone) return;
    if (canPrompt) {
      const result = await promptInstall();
      if (result === 'unavailable') setGuideOpen(true);
      return;
    }
    setGuideOpen(true);
  };

  const text = installed || isStandalone ? 'インストール済み' : label || 'アプリとしてインストール';

  return (
    <>
      <button className={className} onClick={onClick} disabled={installed || isStandalone}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M7 10l5 5 5-5" />
          <path d="M12 15V3" />
        </svg>
        {text}
      </button>

      {guideOpen && (
        <div className="install-backdrop" onClick={() => setGuideOpen(false)}>
          <div
            className="install-sheet m3-card"
            role="dialog"
            aria-modal="true"
            aria-label="アプリのインストール方法"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="install-head">
              <h2>アプリとしてインストール</h2>
              <button className="install-close" onClick={() => setGuideOpen(false)} aria-label="閉じる">
                ✕
              </button>
            </div>

            <p className="install-lead">
              CrossLinkをインストールすると、ブラウザのタブを開かずにアプリのように起動でき、オフラインでも画面が開きます。
            </p>

            {isIos ? (
              <ol className="install-steps">
                <li>
                  Safariの画面下（または上部）にある<strong>共有ボタン</strong>
                  <span className="ios-share-icon" aria-hidden="true">□↑</span>
                  をタップします。
                </li>
                <li>
                  メニューを下にスクロールして<strong>「ホーム画面に追加」</strong>を選択します。
                </li>
                <li>
                  右上の<strong>「追加」</strong>を押すと、ホーム画面にCrossLinkのアイコンが追加されます。
                </li>
              </ol>
            ) : (
              <ol className="install-steps">
                <li>
                  Chrome / Edge の場合、アドレスバー右側の<strong>インストールアイコン</strong>
                  （モニターに下向き矢印のマーク）をクリックします。
                </li>
                <li>
                  表示されない場合はブラウザのメニュー（︙）から<strong>「アプリをインストール」</strong>
                  または<strong>「CrossLinkをインストール」</strong>を選びます。
                </li>
                <li>
                  インストール後は、デスクトップやアプリ一覧のCrossLinkアイコンから起動できます。
                </li>
              </ol>
            )}

            <div className="install-note">
              Androidの場合は、Chromeでこのページを開いてメニューの「アプリをインストール」から追加できます。
            </div>

            <div className="install-actions">
              <button className="m3-btn m3-btn-primary" onClick={() => setGuideOpen(false)}>
                わかりました
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .install-backdrop {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
          padding: 20px;
        }
        .install-sheet {
          width: 100%;
          max-width: 460px;
          background-color: var(--md-sys-color-surface-container-high);
          border-radius: var(--radius-xl);
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: var(--shadow-3);
        }
        .install-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .install-head h2 {
          font-size: 1.2rem;
          font-weight: 700;
        }
        .install-close {
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 1.05rem;
          color: var(--md-sys-color-outline);
          padding: 4px 8px;
          border-radius: var(--radius-full);
        }
        .install-close:hover {
          background-color: var(--md-sys-color-surface-container-highest);
          color: var(--md-sys-color-on-surface);
        }
        .install-lead {
          font-size: 0.92rem;
          line-height: 1.6;
          color: var(--md-sys-color-on-surface-variant);
        }
        .install-steps {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-left: 20px;
          font-size: 0.9rem;
          line-height: 1.6;
        }
        .ios-share-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin: 0 4px;
          padding: 1px 6px;
          border-radius: 6px;
          background-color: var(--md-sys-color-surface-container-highest);
          font-size: 0.85rem;
        }
        .install-note {
          font-size: 0.82rem;
          line-height: 1.5;
          color: var(--md-sys-color-on-surface-variant);
          background-color: var(--md-sys-color-surface-container);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
        }
        .install-actions {
          display: flex;
          justify-content: flex-end;
        }
      `}</style>
    </>
  );
}
