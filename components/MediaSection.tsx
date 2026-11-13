'use client';

import React from 'react';
import { MediaState } from '@/lib/types';

interface Props {
  media: MediaState | null;
  onControl: (action: 'play' | 'pause' | 'next' | 'prev') => void;
}

export default function MediaSection({ media, onControl }: Props) {
  if (!media || !media.title) {
    return null;
  }

  return (
    <div className="media-widget m3-card">
      <div className="album-art">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </div>

      <div className="media-info">
        <span className="media-title">{media.title}</span>
        <span className="media-artist">{media.artist} {media.album ? `• ${media.album}` : ''}</span>
      </div>

      <div className="media-controls">
        <button
          className="control-btn"
          onClick={() => onControl('prev')}
          title="前の曲"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="19 20 9 12 19 4 19 20"/>
            <line x1="5" x2="5" y1="19" y2="5" stroke="currentColor" strokeWidth="3"/>
          </svg>
        </button>

        <button
          className="control-btn play-pause-btn"
          onClick={() => onControl(media.isPlaying ? 'pause' : 'play')}
          title={media.isPlaying ? '一時停止' : '再生'}
        >
          {media.isPlaying ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          )}
        </button>

        <button
          className="control-btn"
          onClick={() => onControl('next')}
          title="次の曲"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 4 15 12 5 20 5 4"/>
            <line x1="19" x2="19" y1="5" y2="19" stroke="currentColor" strokeWidth="3"/>
          </svg>
        </button>
      </div>

      <style jsx>{`
        .media-widget {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 20px;
          background-color: var(--md-sys-color-primary-container);
          color: var(--md-sys-color-on-primary-container);
          border-radius: var(--radius-xl);
          margin-bottom: 24px;
        }
        .album-art {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          background-color: rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .media-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .media-title {
          font-weight: 700;
          font-size: 0.95rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .media-artist {
          font-size: 0.8rem;
          opacity: 0.8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .media-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .control-btn {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-full);
          border: none;
          background: transparent;
          color: inherit;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .control-btn:hover {
          background-color: rgba(0, 0, 0, 0.08);
        }
        .play-pause-btn {
          background-color: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
        }
        .play-pause-btn:hover {
          filter: brightness(1.1);
        }
      `}</style>
    </div>
  );
}
