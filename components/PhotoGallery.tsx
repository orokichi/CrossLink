'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PhotoMeta } from '@/lib/types';

interface Props {
  sessionId: string;
  /** Bumped by the page whenever a photo event arrives, to refresh the grid. */
  refreshToken: number;
  connected: boolean;
  onCountChange?: (count: number) => void;
  /** Called when the user asks to see the pairing instructions. */
  onOpenPairing: () => void;
}

interface PhotoResponse {
  ok: boolean;
  items?: PhotoMeta[];
  count?: number;
  limit?: number;
  error?: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PhotoGallery({
  sessionId,
  refreshToken,
  connected,
  onCountChange,
  onOpenPairing,
}: Props) {
  const [photos, setPhotos] = useState<PhotoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(60);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onCountRef = useRef(onCountChange);

  useEffect(() => {
    onCountRef.current = onCountChange;
  }, [onCountChange]);

  const load = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/session/${sessionId}/photos`, { cache: 'no-store' });
      const data: PhotoResponse = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || '写真を読み込めませんでした');
        return;
      }
      setPhotos(data.items || []);
      setLimit(data.limit || 60);
      setError(null);
      onCountRef.current?.(data.count ?? (data.items || []).length);
    } catch {
      setError('写真を読み込めませんでした');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  // Keep the grid fresh while the tab is open (the phone may upload in the background).
  useEffect(() => {
    if (!sessionId) return;
    const id = window.setInterval(load, 20000);
    return () => window.clearInterval(id);
  }, [sessionId, load]);

  const uploadFiles = async (files: FileList | File[]) => {
    if (!sessionId) return;
    const images = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (images.length === 0) return;

    setUploading(true);
    for (const file of images.slice(0, 20)) {
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('source', 'web');
        form.append('name', file.name);
        form.append('takenAt', String(file.lastModified || Date.now()));
        await fetch(`/api/session/${sessionId}/photos`, { method: 'POST', body: form });
      } catch {
        /* continue with the remaining files */
      }
    }
    setUploading(false);
    await load();
  };

  const removePhoto = async (photo: PhotoMeta) => {
    if (!sessionId) return;
    if (!window.confirm(`「${photo.name}」をCrossLinkから削除しますか？（スマートフォン内の元の写真は消えません）`)) return;
    try {
      await fetch(`/api/session/${sessionId}/photos/${photo.id}`, { method: 'DELETE' });
      setSelectedIndex(null);
      await load();
    } catch {
      setError('削除できませんでした');
    }
  };

  const selected = selectedIndex !== null ? photos[selectedIndex] : null;

  useEffect(() => {
    if (selectedIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedIndex(null);
      if (event.key === 'ArrowRight') setSelectedIndex((i) => (i === null ? null : Math.min(photos.length - 1, i + 1)));
      if (event.key === 'ArrowLeft') setSelectedIndex((i) => (i === null ? null : Math.max(0, i - 1)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIndex, photos.length]);

  return (
    <section className="photo-section m3-card">
      <div className="photo-header">
        <div className="title-group">
          <div className="icon-badge">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect width="18" height="18" x="3" y="3" rx="3" />
              <circle cx="9" cy="9" r="1.6" />
              <path d="M21 15l-4.5-4.5L6 21" />
            </svg>
          </div>
          <div>
            <h2 className="section-title">写真ライブラリ</h2>
            <p className="section-desc">
              スマートフォンの写真をブラウザで閲覧 — {photos.length} / {limit} 枚
            </p>
          </div>
        </div>

        <div className="photo-actions">
          <button className="m3-btn m3-btn-outlined photo-btn" onClick={onOpenPairing} title="ペアリングコードを表示">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M7 7h.01M17 7h.01M7 17h.01M17 17h.01" />
            </svg>
            ペアリング
          </button>
          <button
            className="m3-btn m3-btn-tonal photo-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M17 8l-5-5-5 5" />
              <path d="M12 3v12" />
            </svg>
            {uploading ? 'アップロード中…' : '写真を追加'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) uploadFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {loading ? (
        <div className="photo-empty">
          <p>写真を読み込んでいます…</p>
        </div>
      ) : photos.length === 0 ? (
        <div
          className={`photo-empty ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.45 }}>
            <rect width="18" height="18" x="3" y="3" rx="3" />
            <circle cx="9" cy="9" r="1.6" />
            <path d="M21 15l-4.5-4.5L6 21" />
          </svg>
          <p className="empty-title">まだ写真がありません</p>
          <p className="empty-sub">
            Androidアプリの「写真ライブラリ」で<strong>アクセスを許可</strong>して同期すると、ここに一覧が表示されます。
            {!connected && ' スマートフォンは現在未接続です。'}
          </p>
          <div className="empty-actions">
            <button className="m3-btn m3-btn-outlined photo-btn" onClick={onOpenPairing}>
              接続手順を見る
            </button>
            <button className="m3-btn m3-btn-tonal photo-btn" onClick={() => fileInputRef.current?.click()}>
              この端末から追加
            </button>
          </div>
          <p className="empty-drop">画像をここにドラッグ＆ドロップしても追加できます</p>
        </div>
      ) : (
        <div
          className={`photo-grid ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
          }}
        >
          {photos.map((photo, index) => (
            <button key={photo.id} className="photo-tile" onClick={() => setSelectedIndex(index)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.name} loading="lazy" />
              <span className="photo-tile-overlay">
                <span className="photo-tile-date">{formatDate(photo.takenAt || photo.timestamp).slice(0, 16)}</span>
              </span>
              {photo.source === 'web' && <span className="photo-source">この端末</span>}
            </button>
          ))}
        </div>
      )}

      {error && <p className="photo-error">{error}</p>}

      {selected && (
        <div className="lightbox" onClick={() => setSelectedIndex(null)}>
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-top">
              <div className="lightbox-meta">
                <strong>{selected.name}</strong>
                <span>
                  {formatDate(selected.takenAt || selected.timestamp)} · {formatBytes(selected.size)}
                  {selected.width && selected.height ? ` · ${selected.width}×${selected.height}` : ''}
                </span>
              </div>
              <button className="lightbox-close" onClick={() => setSelectedIndex(null)} aria-label="閉じる">
                ✕
              </button>
            </div>

            <div className="lightbox-stage">
              {selectedIndex !== null && selectedIndex > 0 && (
                <button
                  className="lightbox-nav prev"
                  onClick={() => setSelectedIndex((i) => (i === null ? null : Math.max(0, i - 1)))}
                  aria-label="前の写真"
                >
                  ‹
                </button>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.url} alt={selected.name} />
              {selectedIndex !== null && selectedIndex < photos.length - 1 && (
                <button
                  className="lightbox-nav next"
                  onClick={() => setSelectedIndex((i) => (i === null ? null : Math.min(photos.length - 1, i + 1)))}
                  aria-label="次の写真"
                >
                  ›
                </button>
              )}
            </div>

            <div className="lightbox-bottom">
              <span className="lightbox-counter">
                {(selectedIndex ?? 0) + 1} / {photos.length}
              </span>
              <div className="lightbox-actions">
                <a
                  className="m3-btn m3-btn-tonal photo-btn"
                  href={`${selected.url}?download=1`}
                  download={selected.name}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="M7 10l5 5 5-5" />
                    <path d="M12 15V3" />
                  </svg>
                  ダウンロード
                </a>
                <button className="m3-btn m3-btn-outlined photo-btn" onClick={() => removePhoto(selected)}>
                  削除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .photo-section {
          background-color: var(--md-sys-color-surface-container);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .photo-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
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
          background-color: var(--md-sys-color-tertiary-container);
          color: var(--md-sys-color-on-tertiary-container);
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
        .photo-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .photo-btn {
          padding: 7px 14px;
          font-size: 0.84rem;
        }
        .photo-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          text-align: center;
          padding: 40px 20px;
          border-radius: var(--radius-lg);
          border: 2px dashed var(--md-sys-color-outline-variant);
          background-color: var(--md-sys-color-surface-container-low);
          color: var(--md-sys-color-on-surface-variant);
          transition: border-color 0.2s ease, background-color 0.2s ease;
        }
        .photo-empty.dragging,
        .photo-grid.dragging {
          border-color: var(--md-sys-color-primary);
          background-color: rgba(0, 106, 106, 0.06);
        }
        .empty-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--md-sys-color-on-surface);
          margin-top: 6px;
        }
        .empty-sub {
          font-size: 0.86rem;
          line-height: 1.6;
          max-width: 460px;
        }
        .empty-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 8px;
        }
        .empty-drop {
          font-size: 0.76rem;
          opacity: 0.7;
          margin-top: 4px;
        }
        .photo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(136px, 1fr));
          gap: 10px;
          border-radius: var(--radius-md);
        }
        .photo-tile {
          position: relative;
          aspect-ratio: 1;
          border: none;
          padding: 0;
          border-radius: var(--radius-md);
          overflow: hidden;
          cursor: zoom-in;
          background-color: var(--md-sys-color-surface-container-highest);
          box-shadow: var(--shadow-1);
          transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.2s ease;
        }
        .photo-tile:hover {
          transform: translateY(-2px) scale(1.01);
          box-shadow: var(--shadow-2);
        }
        .photo-tile img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .photo-tile-overlay {
          position: absolute;
          inset: auto 0 0 0;
          padding: 16px 8px 6px;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
          color: #fff;
          font-size: 0.68rem;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .photo-tile:hover .photo-tile-overlay {
          opacity: 1;
        }
        .photo-tile-date {
          font-weight: 600;
        }
        .photo-source {
          position: absolute;
          top: 6px;
          right: 6px;
          font-size: 0.62rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: var(--radius-full);
          background-color: rgba(0, 0, 0, 0.55);
          color: #fff;
        }
        .photo-error {
          font-size: 0.84rem;
          color: var(--md-sys-color-error);
        }
        .lightbox {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.88);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1300;
          padding: 16px;
        }
        .lightbox-inner {
          width: 100%;
          max-width: 1080px;
          height: 100%;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          gap: 10px;
          color: #fff;
        }
        .lightbox-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .lightbox-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .lightbox-meta strong {
          font-size: 0.95rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .lightbox-meta span {
          font-size: 0.78rem;
          opacity: 0.75;
        }
        .lightbox-close {
          background: rgba(255, 255, 255, 0.12);
          border: none;
          color: #fff;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1rem;
          flex-shrink: 0;
        }
        .lightbox-close:hover {
          background: rgba(255, 255, 255, 0.22);
        }
        .lightbox-stage {
          position: relative;
          flex: 1;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .lightbox-stage img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: var(--radius-sm);
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5);
        }
        .lightbox-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.16);
          color: #fff;
          font-size: 1.6rem;
          line-height: 1;
          cursor: pointer;
        }
        .lightbox-nav:hover {
          background: rgba(255, 255, 255, 0.28);
        }
        .lightbox-nav.prev {
          left: 4px;
        }
        .lightbox-nav.next {
          right: 4px;
        }
        .lightbox-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .lightbox-counter {
          font-size: 0.82rem;
          opacity: 0.75;
          font-variant-numeric: tabular-nums;
        }
        .lightbox-actions {
          display: flex;
          gap: 8px;
        }
        @media (max-width: 520px) {
          .photo-grid {
            grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
            gap: 8px;
          }
          .lightbox-actions :global(.m3-btn) {
            font-size: 0.8rem;
            padding: 8px 12px;
          }
        }
      `}</style>
    </section>
  );
}
