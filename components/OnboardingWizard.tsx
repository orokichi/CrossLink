'use client';

import React, { useCallback, useEffect, useState } from 'react';

type PermissionState = NotificationPermission | 'unsupported';

interface Props {
  open: boolean;
  /** true when the wizard was opened manually from settings (shows a close button). */
  reopen: boolean;
  code: string;
  notificationPermission: PermissionState;
  onRequestNotifications: () => Promise<PermissionState>;
  onNewCode: () => void;
  onOpenPhotos: () => void;
  onFinish: () => void;
  onClose: () => void;
}

const STEPS = 4;

export default function OnboardingWizard({
  open,
  reopen,
  code,
  notificationPermission,
  onRequestNotifications,
  onNewCode,
  onOpenPhotos,
  onFinish,
  onClose,
}: Props) {
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [permission, setPermission] = useState<PermissionState>(notificationPermission);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(0);
      setCopied(null);
      setPermission(notificationPermission);
    }
  }, [open, notificationPermission]);

  const copyText = useCallback(async (value: string, kind: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
    } catch {
      // Fallback for browsers without the async clipboard API.
      const area = document.createElement('textarea');
      area.value = value;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
        setCopied(kind);
      } catch {
        setCopied(null);
      }
      document.body.removeChild(area);
    }
    window.setTimeout(() => setCopied(null), 2200);
  }, []);

  const shareCode = useCallback(async () => {
    const link = typeof window !== 'undefined' ? `${window.location.origin}/?code=${code}` : '';
    const data = {
      title: 'CrossLink',
      text: `CrossLinkのペアリングコードは ${code} です。Androidアプリの「6桁のペアリングコード」に入力してください。`,
      url: link,
    };
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share(data);
        return;
      } catch {
        /* user cancelled sharing — fall back to copying the code */
      }
    }
    await copyText(code, 'code');
  }, [code, copyText]);

  const requestNotifications = async () => {
    setBusy(true);
    const result = await onRequestNotifications();
    setPermission(result);
    setBusy(false);
  };

  if (!open) return null;

  const finish = () => {
    onFinish();
  };

  const link = typeof window !== 'undefined' ? `${window.location.origin}/?code=${code}` : '';

  return (
    <div className="ob-backdrop">
      <div className="ob-card" role="dialog" aria-modal="true" aria-label="CrossLink 初期設定">
        <div className="ob-progress">
          <div className="ob-progress-track">
            <div className="ob-progress-fill" style={{ width: `${((step + 1) / STEPS) * 100}%` }} />
          </div>
          <span className="ob-progress-label">
            {step + 1} / {STEPS}
          </span>
          {(reopen || step > 0) && (
            <button className="ob-close" onClick={onClose} aria-label="初期設定を閉じる">
              ✕
            </button>
          )}
        </div>

        <div className="ob-body">
          {step === 0 && (
            <section className="ob-section">
              <div className="ob-hero">
                <div className="ob-hero-icon">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <div>
                  <h1 className="ob-title">CrossLinkへようこそ</h1>
                  <p className="ob-subtitle">スマートフォンとこのブラウザをつないで、初期設定を始めましょう。</p>
                </div>
              </div>

              <p className="ob-text">
                Androidスマートフォンの <strong>CrossLink</strong> アプリに、下の6桁のコードを入力してください。入力すると、クリップボード・ファイル・通知・写真がこの画面と同期されます。
              </p>

              <div className="ob-code">
                <span className="ob-code-label">ペアリングコード</span>
                <div className="ob-code-row">
                  <span className="ob-code-value">{code || '------'}</span>
                  <button className="ob-icon-btn" onClick={onNewCode} title="新しいコードを生成">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M21 2v6h-6" />
                      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                      <path d="M3 22v-6h6" />
                      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="ob-row">
                <button className="m3-btn m3-btn-outlined ob-flex" onClick={() => copyText(code, 'code')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="14" height="14" x="8" y="8" rx="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                  {copied === 'code' ? 'コピーしました' : 'コードをコピー'}
                </button>
                <button className="m3-btn m3-btn-tonal ob-flex" onClick={shareCode}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
                  </svg>
                  共有する
                </button>
              </div>

              <div className="ob-hint">
                <span className="ob-hint-label">リンクで共有</span>
                <code>{link}</code>
                <button className="ob-link-btn" onClick={() => copyText(link, 'link')}>
                  {copied === 'link' ? 'コピーしました' : 'コピー'}
                </button>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="ob-section">
              <div className="ob-hero">
                <div className="ob-hero-icon ob-hero-icon-alt">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                </div>
                <div>
                  <h1 className="ob-title">通知を許可する</h1>
                  <p className="ob-subtitle">スマートフォンに届いた通知を、このブラウザでも受け取れるようにします。</p>
                </div>
              </div>

              <ul className="ob-list">
                <li>スマートフォンの画面を見ていなくても、メッセージや着信に気づけます。</li>
                <li>通知の中身はこのブラウザの中だけで表示され、CrossLinkのサーバーには保存されません。</li>
                <li>あとからブラウザの設定でいつでもオフにできます。</li>
              </ul>

              <div className={`ob-status ${permission === 'granted' ? 'ok' : permission === 'denied' ? 'ng' : ''}`}>
                <span className="ob-status-dot" />
                {permission === 'granted' && '通知は許可されています'}
                {permission === 'denied' && '通知がブロックされています（ブラウザの設定から許可してください）'}
                {permission === 'default' && 'まだ通知は許可されていません'}
                {permission === 'unsupported' && 'このブラウザはWeb通知に対応していません'}
              </div>

              {permission !== 'granted' && permission !== 'unsupported' && (
                <button className="m3-btn m3-btn-primary ob-full" onClick={requestNotifications} disabled={busy}>
                  {busy ? '確認中…' : '通知を許可する'}
                </button>
              )}
            </section>
          )}

          {step === 2 && (
            <section className="ob-section">
              <div className="ob-hero">
                <div className="ob-hero-icon ob-hero-icon-alt2">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect width="18" height="18" x="3" y="3" rx="3" />
                    <circle cx="9" cy="9" r="1.6" />
                    <path d="M21 15l-4.5-4.5L6 21" />
                  </svg>
                </div>
                <div>
                  <h1 className="ob-title">写真ライブラリをつなぐ</h1>
                  <p className="ob-subtitle">スマートフォンの中の写真を、このブラウザでそのまま見られます。</p>
                </div>
              </div>

              <ol className="ob-steps">
                <li>
                  <span className="ob-step-num">1</span>
                  <div>
                    <strong>スマートフォンでCrossLinkアプリを開く</strong>
                    <p>GitHub Releasesから最新のAPKをインストールし、上のペアリングコードを入力します。</p>
                  </div>
                </li>
                <li>
                  <span className="ob-step-num">2</span>
                  <div>
                    <strong>アプリの「写真ライブラリ」で許可する</strong>
                    <p>写真へのアクセスを許可すると、端末の写真が最適化されて同期されます。</p>
                  </div>
                </li>
                <li>
                  <span className="ob-step-num">3</span>
                  <div>
                    <strong>このブラウザの「写真」タブで見る</strong>
                    <p>グリッドで一覧、タップで拡大、そのままダウンロードできます。</p>
                  </div>
                </li>
              </ol>

              <div className="ob-note">
                写真は同期したときに長辺1600pxに最適化されます。元の画像はスマートフォンにそのまま残ります。
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="ob-section">
              <div className="ob-hero">
                <div className="ob-hero-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <path d="M22 4L12 14.01l-3-3" />
                  </svg>
                </div>
                <div>
                  <h1 className="ob-title">使い方のチュートリアル</h1>
                  <p className="ob-subtitle">4つの機能をひととおり確認したら準備完了です。</p>
                </div>
              </div>

              <div className="ob-features">
                <div className="ob-feature">
                  <div className="ob-feature-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect width="8" height="4" x="8" y="2" rx="1" />
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      <path d="M9 12h6M9 16h4" />
                    </svg>
                  </div>
                  <div>
                    <h3>クリップボード同期</h3>
                    <p>スマートフォンでコピーしたテキストが、そのままここに現れます。ここで入力した文章もスマートフォンへ送れます。</p>
                  </div>
                </div>

                <div className="ob-feature">
                  <div className="ob-feature-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                  </div>
                  <div>
                    <h3>ファイル共有</h3>
                    <p>写真・PDF・書類をどちらの向きにも送れます。ドラッグ＆ドロップか「ファイルを選択」から。</p>
                  </div>
                </div>

                <div className="ob-feature">
                  <div className="ob-feature-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                  </div>
                  <div>
                    <h3>通知ミラーリング</h3>
                    <p>スマートフォンの通知が一覧に流れます。「端末を探す」ボタンで、スマートフォンを鳴らして探せます。</p>
                  </div>
                </div>

                <div className="ob-feature">
                  <div className="ob-feature-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect width="18" height="18" x="3" y="3" rx="3" />
                      <circle cx="9" cy="9" r="1.6" />
                      <path d="M21 15l-4.5-4.5L6 21" />
                    </svg>
                  </div>
                  <div>
                    <h3>写真ライブラリ</h3>
                    <p>「写真」タブでグリッド表示・拡大・ダウンロード。スマートフォンの写真をアップロード不要で確認できます。</p>
                  </div>
                </div>
              </div>

              <p className="ob-text ob-text-soft">
                この初期設定は、右上の設定（歯車）からいつでも開き直せます。
              </p>
            </section>
          )}
        </div>

        <div className="ob-footer">
          {step > 0 ? (
            <button className="m3-btn m3-btn-outlined" onClick={() => setStep((s) => Math.max(0, s - 1))}>
              戻る
            </button>
          ) : (
            <button className="m3-btn m3-btn-outlined" onClick={onClose}>
              あとで
            </button>
          )}

          {step === 2 && (
            <button
              className="m3-btn m3-btn-tonal ob-flex"
              onClick={() => {
                onOpenPhotos();
                finish();
              }}
            >
              写真タブを開く
            </button>
          )}

          {step < STEPS - 1 ? (
            <button className="m3-btn m3-btn-primary ob-flex" onClick={() => setStep((s) => Math.min(STEPS - 1, s + 1))}>
              次へ
            </button>
          ) : (
            <button className="m3-btn m3-btn-primary ob-flex" onClick={finish}>
              はじめる
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .ob-backdrop {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at 50% 0%, rgba(0, 106, 106, 0.28), rgba(0, 0, 0, 0.55) 65%);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          padding: 16px;
        }
        .ob-card {
          width: 100%;
          max-width: 560px;
          max-height: min(92vh, 760px);
          background-color: var(--md-sys-color-surface-container-lowest);
          color: var(--md-sys-color-on-surface);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-3);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .ob-progress {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 18px 24px 0;
        }
        .ob-progress-track {
          flex: 1;
          height: 6px;
          background-color: var(--md-sys-color-surface-container-high);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        .ob-progress-fill {
          height: 100%;
          background-color: var(--md-sys-color-primary);
          border-radius: var(--radius-full);
          transition: width 0.35s cubic-bezier(0.2, 0, 0, 1);
        }
        .ob-progress-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--md-sys-color-on-surface-variant);
          font-variant-numeric: tabular-nums;
        }
        .ob-close {
          background: transparent;
          border: none;
          color: var(--md-sys-color-outline);
          font-size: 1rem;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: var(--radius-full);
        }
        .ob-close:hover {
          background-color: var(--md-sys-color-surface-container-high);
          color: var(--md-sys-color-on-surface);
        }
        .ob-body {
          padding: 20px 24px 8px;
          overflow-y: auto;
        }
        .ob-section {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .ob-hero {
          display: flex;
          gap: 14px;
          align-items: center;
        }
        .ob-hero-icon {
          width: 56px;
          height: 56px;
          border-radius: 20px;
          background-color: var(--md-sys-color-primary-container);
          color: var(--md-sys-color-on-primary-container);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ob-hero-icon-alt {
          background-color: var(--md-sys-color-secondary-container);
          color: var(--md-sys-color-on-secondary-container);
        }
        .ob-hero-icon-alt2 {
          background-color: var(--md-sys-color-tertiary-container);
          color: var(--md-sys-color-on-tertiary-container);
        }
        .ob-title {
          font-size: 1.4rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .ob-subtitle {
          font-size: 0.86rem;
          color: var(--md-sys-color-on-surface-variant);
          line-height: 1.5;
          margin-top: 2px;
        }
        .ob-text {
          font-size: 0.93rem;
          line-height: 1.7;
          color: var(--md-sys-color-on-surface-variant);
        }
        .ob-text-soft {
          font-size: 0.84rem;
          opacity: 0.85;
        }
        .ob-code {
          background-color: var(--md-sys-color-primary-container);
          color: var(--md-sys-color-on-primary-container);
          border-radius: var(--radius-lg);
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .ob-code-label {
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          opacity: 0.75;
        }
        .ob-code-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .ob-code-value {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 2.2rem;
          font-weight: 800;
          letter-spacing: 0.28em;
        }
        .ob-icon-btn {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-full);
          border: none;
          background-color: rgba(0, 0, 0, 0.08);
          color: inherit;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .ob-icon-btn:hover {
          background-color: rgba(0, 0, 0, 0.16);
        }
        .ob-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .ob-flex {
          flex: 1;
        }
        .ob-full {
          width: 100%;
        }
        .ob-hint {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.78rem;
          background-color: var(--md-sys-color-surface-container);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          overflow: hidden;
        }
        .ob-hint-label {
          font-weight: 700;
          color: var(--md-sys-color-on-surface-variant);
          flex-shrink: 0;
        }
        .ob-hint code {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 0.76rem;
          color: var(--md-sys-color-on-surface-variant);
        }
        .ob-link-btn {
          border: none;
          background: transparent;
          color: var(--md-sys-color-primary);
          font-weight: 700;
          font-size: 0.78rem;
          cursor: pointer;
          flex-shrink: 0;
        }
        .ob-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-left: 18px;
          font-size: 0.9rem;
          line-height: 1.6;
          color: var(--md-sys-color-on-surface-variant);
        }
        .ob-status {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.86rem;
          font-weight: 600;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          background-color: var(--md-sys-color-surface-container);
          color: var(--md-sys-color-on-surface-variant);
        }
        .ob-status-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background-color: var(--md-sys-color-outline);
          flex-shrink: 0;
        }
        .ob-status.ok {
          background-color: rgba(46, 125, 50, 0.12);
          color: #2e7d32;
        }
        .ob-status.ok .ob-status-dot {
          background-color: #2e7d32;
        }
        .ob-status.ng {
          background-color: var(--md-sys-color-error-container);
          color: var(--md-sys-color-on-error-container);
        }
        .ob-status.ng .ob-status-dot {
          background-color: var(--md-sys-color-error);
        }
        .ob-steps {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .ob-steps li {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .ob-step-num {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
          border-radius: 50%;
          background-color: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
          font-size: 0.78rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }
        .ob-steps strong {
          font-size: 0.92rem;
        }
        .ob-steps p {
          font-size: 0.84rem;
          line-height: 1.55;
          color: var(--md-sys-color-on-surface-variant);
          margin-top: 2px;
        }
        .ob-note {
          font-size: 0.8rem;
          line-height: 1.55;
          color: var(--md-sys-color-on-surface-variant);
          background-color: var(--md-sys-color-surface-container);
          border-left: 3px solid var(--md-sys-color-tertiary);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
        }
        .ob-features {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ob-feature {
          display: flex;
          gap: 12px;
          padding: 12px 14px;
          border-radius: var(--radius-md);
          background-color: var(--md-sys-color-surface-container-low);
        }
        .ob-feature-icon {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background-color: var(--md-sys-color-secondary-container);
          color: var(--md-sys-color-on-secondary-container);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ob-feature h3 {
          font-size: 0.9rem;
          font-weight: 700;
        }
        .ob-feature p {
          font-size: 0.82rem;
          line-height: 1.55;
          color: var(--md-sys-color-on-surface-variant);
          margin-top: 2px;
        }
        .ob-footer {
          display: flex;
          gap: 10px;
          padding: 16px 24px 22px;
          border-top: 1px solid var(--md-sys-color-outline-variant);
          margin-top: 12px;
        }
        .ob-footer :global(.m3-btn) {
          padding: 11px 18px;
        }
        @media (max-width: 520px) {
          .ob-body {
            padding: 18px 18px 6px;
          }
          .ob-footer {
            padding: 14px 18px 18px;
          }
          .ob-progress {
            padding: 16px 18px 0;
          }
          .ob-code-value {
            font-size: 1.8rem;
          }
        }
      `}</style>
    </div>
  );
}
