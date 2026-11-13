'use client';

import React from 'react';
import { DeviceStatus } from '@/lib/types';

interface Props {
  status: DeviceStatus;
  code: string;
  onOpenPairing: () => void;
  onRingPhone: () => void;
  isRinging: boolean;
}

export default function DeviceHeader({
  status,
  code,
  onOpenPairing,
  onRingPhone,
  isRinging,
}: Props) {
  return (
    <header className="device-header m3-card">
      <div className="header-left">
        <div className="phone-avatar">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="14" height="20" x="5" y="2" rx="3" ry="3"/>
            <path d="M12 18h.01"/>
          </svg>
          <span className={`status-dot ${status.connected ? 'online' : 'offline'}`} />
        </div>
        <div className="device-info">
          <div className="device-title-row">
            <h1 className="device-name">{status.deviceName || 'Pixel 9a'}</h1>
            <span className={`m3-badge ${status.connected ? 'm3-badge-success' : ''}`}>
              {status.connected ? '接続中' : '未接続'}
            </span>
          </div>
          <div className="device-meta">
            <span className="meta-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="16" height="10" x="2" y="7" rx="2" ry="2"/>
                <line x1="22" x2="22" y1="11" y2="13"/>
                <line x1="6" x2="6" y1="11" y2="13"/>
              </svg>
              {status.batteryLevel}% {status.isCharging ? '⚡ 充電中' : ''}
            </span>
            <span className="meta-separator">•</span>
            <span className="meta-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
                <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                <line x1="12" x2="12.01" y1="20" y2="20"/>
              </svg>
              {status.wifiSsid ? status.wifiSsid : status.networkType === 'wifi' ? 'Wi-Fi 接続' : 'モバイル回線'}
            </span>
          </div>
        </div>
      </div>

      <div className="header-actions">
        {status.connected && (
          <button
            className={`m3-btn ${isRinging ? 'm3-btn-primary' : 'm3-btn-tonal'}`}
            onClick={onRingPhone}
            title="スマートフォンから音を鳴らして探します"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            </svg>
            {isRinging ? '呼出中...' : '端末を探す'}
          </button>
        )}
        <button className="m3-btn m3-btn-outlined" onClick={onOpenPairing}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <path d="M7 7h.01"/>
            <path d="M17 7h.01"/>
            <path d="M7 17h.01"/>
            <path d="M17 17h.01"/>
          </svg>
          コード: {code}
        </button>
      </div>

      <style jsx>{`
        .device-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
          padding: 20px 28px;
          background-color: var(--md-sys-color-surface-container-high);
          border-radius: var(--radius-xl);
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 18px;
        }
        .phone-avatar {
          position: relative;
          width: 54px;
          height: 54px;
          border-radius: var(--radius-lg);
          background-color: var(--md-sys-color-primary-container);
          color: var(--md-sys-color-on-primary-container);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .status-dot {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid var(--md-sys-color-surface-container-high);
        }
        .status-dot.online {
          background-color: #2e7d32;
        }
        .status-dot.offline {
          background-color: var(--md-sys-color-outline);
        }
        .device-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .device-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .device-name {
          font-size: 1.4rem;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .device-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: var(--md-sys-color-on-surface-variant);
        }
        .meta-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .meta-separator {
          opacity: 0.5;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        @media (max-width: 768px) {
          .device-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .header-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>
    </header>
  );
}
