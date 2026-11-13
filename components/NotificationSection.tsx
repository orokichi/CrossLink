'use client';

import React from 'react';
import { PhoneNotification } from '@/lib/types';

interface Props {
  notifications: PhoneNotification[];
  onClearAll: () => void;
  onDismiss: (id: string) => void;
}

export default function NotificationSection({
  notifications,
  onClearAll,
  onDismiss,
}: Props) {
  return (
    <section className="notification-section m3-card">
      <div className="section-header">
        <div className="title-group">
          <div className="icon-badge">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            </svg>
          </div>
          <div>
            <h2 className="section-title">スマートフォン通知</h2>
            <p className="section-desc">着信、メッセージ、アプリの通知をPC上でリアルタイム確認</p>
          </div>
        </div>

        {notifications.length > 0 && (
          <button className="m3-btn m3-btn-outlined clear-all-btn" onClick={onClearAll}>
            すべて消去
          </button>
        )}
      </div>

      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="empty-notifs">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.5, margin: '0 auto 8px' }}>
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
              <line x1="2" x2="22" y1="2" y2="22"/>
            </svg>
            <p>新しい通知はありません</p>
            <p className="subtext">スマートフォンに届いた通知がここにリアルタイムで表示されます</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div key={notif.id} className="notification-item">
              <div className="notif-header">
                <span className="app-badge">{notif.appName || notif.packageName}</span>
                <span className="notif-time">
                  {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  className="dismiss-btn"
                  onClick={() => onDismiss(notif.id)}
                  title="通知を閉じる"
                >
                  ✕
                </button>
              </div>
              <h4 className="notif-title">{notif.title}</h4>
              <p className="notif-body">{notif.text}</p>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .notification-section {
          background-color: var(--md-sys-color-surface-container);
          display: flex;
          flex-direction: column;
          gap: 16px;
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
          background-color: var(--md-sys-color-secondary-container);
          color: var(--md-sys-color-on-secondary-container);
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
        .clear-all-btn {
          padding: 6px 14px;
          font-size: 0.85rem;
        }
        .notification-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .empty-notifs {
          padding: 32px 16px;
          text-align: center;
          color: var(--md-sys-color-on-surface-variant);
          background-color: var(--md-sys-color-surface-container-low);
          border-radius: var(--radius-md);
          font-size: 0.9rem;
        }
        .subtext {
          font-size: 0.8rem;
          opacity: 0.7;
          margin-top: 4px;
        }
        .notification-item {
          padding: 14px 18px;
          background-color: var(--md-sys-color-surface-container-lowest);
          border-radius: var(--radius-md);
          border-left: 4px solid var(--md-sys-color-primary);
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow: var(--shadow-1);
        }
        .notif-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
        }
        .app-badge {
          font-weight: 700;
          color: var(--md-sys-color-primary);
        }
        .notif-time {
          color: var(--md-sys-color-on-surface-variant);
          margin-right: auto;
        }
        .dismiss-btn {
          background: transparent;
          border: none;
          color: var(--md-sys-color-outline);
          cursor: pointer;
          font-size: 0.9rem;
          padding: 2px 6px;
          border-radius: var(--radius-full);
        }
        .dismiss-btn:hover {
          color: var(--md-sys-color-on-surface);
          background-color: var(--md-sys-color-surface-container-high);
        }
        .notif-title {
          font-size: 0.95rem;
          font-weight: 600;
        }
        .notif-body {
          font-size: 0.88rem;
          color: var(--md-sys-color-on-surface-variant);
          white-space: pre-wrap;
          word-break: break-word;
        }
      `}</style>
    </section>
  );
}
