'use client';

import React from 'react';

interface Props {
  code: string;
  isOpen: boolean;
  onClose: () => void;
  onNewCode: () => void;
}

export default function PairingModal({
  code,
  isOpen,
  onClose,
  onNewCode,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card m3-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">スマートフォンとペアリング</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="pairing-body">
          <p className="step-desc">
            1. Androidスマートフォンで <strong>CrossLink</strong> アプリを開きます。
          </p>
          <p className="step-desc">
            2. 以下の <strong>6桁のペアリングコード</strong> をアプリに入力してください。
          </p>

          <div className="code-display">
            <span className="code-text">{code}</span>
          </div>

          <div className="apk-notice">
            <div className="apk-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="14" height="20" x="5" y="2" rx="3"/>
                <path d="M12 18h.01"/>
              </svg>
            </div>
            <div>
              <p className="apk-title">Androidアプリ (APK) の準備</p>
              <p className="apk-sub">
                本リポジトリのGitHub Releasesから最新の <code>CrossLink.apk</code> をダウンロードして端末にインストールできます。
              </p>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="m3-btn m3-btn-outlined" onClick={onNewCode}>
            新しいコードを生成
          </button>
          <button className="m3-btn m3-btn-primary" onClick={onClose}>
            閉じる
          </button>
        </div>

        <style jsx>{`
          .modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(6px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
          }
          .modal-card {
            width: 100%;
            max-width: 480px;
            background-color: var(--md-sys-color-surface-container-high);
            border-radius: var(--radius-xl);
            display: flex;
            flex-direction: column;
            gap: 20px;
            box-shadow: var(--shadow-3);
          }
          .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .modal-title {
            font-size: 1.3rem;
            font-weight: 700;
          }
          .close-btn {
            background: transparent;
            border: none;
            font-size: 1.2rem;
            cursor: pointer;
            padding: 6px 10px;
            border-radius: var(--radius-full);
            color: var(--md-sys-color-outline);
          }
          .close-btn:hover {
            background-color: var(--md-sys-color-surface-container-highest);
            color: var(--md-sys-color-on-surface);
          }
          .pairing-body {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .step-desc {
            font-size: 0.95rem;
            color: var(--md-sys-color-on-surface);
            line-height: 1.5;
          }
          .code-display {
            background-color: var(--md-sys-color-primary-container);
            color: var(--md-sys-color-on-primary-container);
            padding: 20px;
            border-radius: var(--radius-lg);
            text-align: center;
            margin: 8px 0;
          }
          .code-text {
            font-size: 2.6rem;
            font-weight: 800;
            letter-spacing: 0.25em;
            font-family: monospace;
          }
          .apk-notice {
            display: flex;
            gap: 12px;
            background-color: var(--md-sys-color-surface-container);
            padding: 14px;
            border-radius: var(--radius-md);
            font-size: 0.85rem;
          }
          .apk-icon {
            color: var(--md-sys-color-primary);
            flex-shrink: 0;
          }
          .apk-title {
            font-weight: 700;
            margin-bottom: 2px;
          }
          .apk-sub {
            color: var(--md-sys-color-on-surface-variant);
          }
          .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
          }
        `}</style>
      </div>
    </div>
  );
}
