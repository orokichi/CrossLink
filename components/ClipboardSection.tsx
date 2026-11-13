'use client';

import React, { useState } from 'react';
import { ClipboardItem } from '@/lib/types';

interface Props {
  items: ClipboardItem[];
  onSendText: (text: string) => Promise<void>;
  autoSync: boolean;
  onToggleAutoSync: () => void;
}

export default function ClipboardSection({
  items,
  onSendText,
  autoSync,
  onToggleAutoSync,
}: Props) {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;
    setSending(true);
    try {
      await onSendText(inputText.trim());
      setInputText('');
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <section className="clipboard-section m3-card">
      <div className="section-header">
        <div className="title-group">
          <div className="icon-badge">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <path d="M12 11h4"/>
              <path d="M12 16h4"/>
              <path d="M8 11h.01"/>
              <path d="M8 16h.01"/>
            </svg>
          </div>
          <div>
            <h2 className="section-title">クリップボード同期</h2>
            <p className="section-desc">PCとスマートフォンの間でテキストをシームレスに同期します</p>
          </div>
        </div>

        <label className="sync-toggle">
          <span className="toggle-label">自動同期</span>
          <input
            type="checkbox"
            checked={autoSync}
            onChange={onToggleAutoSync}
            className="toggle-checkbox"
          />
        </label>
      </div>

      <form onSubmit={handleSubmit} className="send-box">
        <textarea
          className="text-input"
          placeholder="スマホへ送信するテキストを入力... (Enterで送信)"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <div className="send-actions">
          <button
            type="button"
            className="m3-btn m3-btn-outlined"
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                if (text) setInputText(text);
              } catch (e) {
                console.warn(e);
              }
            }}
          >
            PCクリップボード貼付
          </button>
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="m3-btn m3-btn-primary"
          >
            {sending ? '送信中...' : 'スマホへ送る'}
          </button>
        </div>
      </form>

      <div className="history-list">
        <h3 className="history-heading">同期履歴</h3>
        {items.length === 0 ? (
          <div className="empty-state">
            <p>まだ同期されたクリップボード履歴はありません。</p>
            <p className="subtext">スマートフォン側でコピーすると、ここに自動で表示されます。</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="history-item">
              <div className="item-meta">
                <span className={`source-pill ${item.source}`}>
                  {item.source === 'phone' ? '📱 スマホから' : '💻 PCから'}
                </span>
                <span className="item-time">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <p className="item-text">{item.text}</p>
              <div className="item-actions">
                <button
                  className="m3-btn m3-btn-tonal copy-btn"
                  onClick={() => handleCopy(item.id, item.text)}
                >
                  {copiedId === item.id ? '✓ コピー完了' : 'コピー'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .clipboard-section {
          background-color: var(--md-sys-color-surface-container);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .title-group {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .icon-badge {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          background-color: var(--md-sys-color-primary-container);
          color: var(--md-sys-color-on-primary-container);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .section-title {
          font-size: 1.25rem;
          font-weight: 700;
        }
        .section-desc {
          font-size: 0.85rem;
          color: var(--md-sys-color-on-surface-variant);
        }
        .sync-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .toggle-checkbox {
          width: 36px;
          height: 20px;
          accent-color: var(--md-sys-color-primary);
          cursor: pointer;
        }
        .send-box {
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: var(--md-sys-color-surface-container-lowest);
          padding: 16px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--md-sys-color-outline-variant);
        }
        .text-input {
          width: 100%;
          border: none;
          background: transparent;
          font-family: inherit;
          font-size: 0.95rem;
          color: var(--md-sys-color-on-surface);
          resize: vertical;
          outline: none;
        }
        .send-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .history-heading {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant);
        }
        .empty-state {
          padding: 32px 16px;
          text-align: center;
          color: var(--md-sys-color-on-surface-variant);
          background-color: var(--md-sys-color-surface-container-low);
          border-radius: var(--radius-md);
        }
        .subtext {
          font-size: 0.8rem;
          opacity: 0.7;
          margin-top: 4px;
        }
        .history-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 14px 18px;
          background-color: var(--md-sys-color-surface-container-lowest);
          border-radius: var(--radius-md);
          border: 1px solid rgba(0, 0, 0, 0.03);
          transition: transform 0.15s ease;
        }
        .history-item:hover {
          transform: translateX(4px);
        }
        .item-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.8rem;
        }
        .source-pill {
          padding: 3px 10px;
          border-radius: var(--radius-full);
          font-weight: 600;
        }
        .source-pill.phone {
          background-color: var(--md-sys-color-primary-container);
          color: var(--md-sys-color-on-primary-container);
        }
        .source-pill.web {
          background-color: var(--md-sys-color-tertiary-container);
          color: var(--md-sys-color-on-tertiary-container);
        }
        .item-time {
          color: var(--md-sys-color-on-surface-variant);
        }
        .item-text {
          font-size: 0.95rem;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .item-actions {
          display: flex;
          justify-content: flex-end;
        }
        .copy-btn {
          padding: 6px 14px;
          font-size: 0.85rem;
        }
      `}</style>
    </section>
  );
}
