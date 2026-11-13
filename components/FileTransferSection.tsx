'use client';

import React, { useState, useRef } from 'react';
import { SharedFile } from '@/lib/types';

interface Props {
  files: SharedFile[];
  onUploadFile: (file: File) => Promise<void>;
}

export default function FileTransferSection({ files, onUploadFile }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
    }
  };

  const processFiles = async (fileList: FileList) => {
    setUploading(true);
    try {
      for (let i = 0; i < fileList.length; i++) {
        await onUploadFile(fileList[i]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <section className="file-section m3-card">
      <div className="section-header">
        <div className="title-group">
          <div className="icon-badge">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/>
              <polyline points="14 2 14 8 20 8"/>
              <path d="M3 15h6"/>
              <path d="m6 12 3 3-3 3"/>
            </svg>
          </div>
          <div>
            <h2 className="section-title">クイックファイル共有</h2>
            <p className="section-desc">PCとスマホの間で写真や書類をドラッグ＆ドロップで即時転送</p>
          </div>
        </div>
      </div>

      <div
        className={`dropzone ${isDragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          multiple
        />
        <div className="dropzone-content">
          <div className="upload-icon-circle">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" x2="12" y1="3" y2="15"/>
            </svg>
          </div>
          <p className="drop-prompt">
            {uploading ? 'アップロード転送中...' : 'ここにファイルをドロップ、またはクリックして選択'}
          </p>
          <p className="drop-sub">写真、動画、PDF、テキストなど何でも直接送れます</p>
        </div>
      </div>

      <div className="file-history">
        <h3 className="history-heading">転送ファイル一覧</h3>
        {files.length === 0 ? (
          <div className="empty-files">
            <p>まだ送受信されたファイルはありません。</p>
          </div>
        ) : (
          <div className="file-grid">
            {files.map((file) => (
              <div key={file.id} className="file-card">
                <div className="file-icon">
                  {file.type.startsWith('image/') ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                      <circle cx="9" cy="9" r="2"/>
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                      <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                    </svg>
                  )}
                </div>
                <div className="file-details">
                  <span className="file-name" title={file.name}>{file.name}</span>
                  <div className="file-meta-row">
                    <span className={`source-pill ${file.source}`}>
                      {file.source === 'phone' ? '📱 スマホ発' : '💻 PC発'}
                    </span>
                    <span>{formatSize(file.size)}</span>
                  </div>
                </div>
                <a
                  href={file.downloadUrl}
                  download={file.name}
                  className="m3-btn m3-btn-tonal dl-btn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" x2="12" y1="15" y2="3"/>
                  </svg>
                  保存
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .file-section {
          background-color: var(--md-sys-color-surface-container);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 14px;
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
        .dropzone {
          border: 2px dashed var(--md-sys-color-outline-variant);
          border-radius: var(--radius-lg);
          padding: 36px 20px;
          text-align: center;
          background-color: var(--md-sys-color-surface-container-lowest);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .dropzone:hover, .dropzone.dragging {
          border-color: var(--md-sys-color-primary);
          background-color: var(--md-sys-color-primary-container);
          transform: scale(1.01);
        }
        .upload-icon-circle {
          width: 52px;
          height: 52px;
          margin: 0 auto 12px;
          border-radius: var(--radius-full);
          background-color: var(--md-sys-color-surface-container-high);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--md-sys-color-primary);
        }
        .drop-prompt {
          font-size: 1rem;
          font-weight: 600;
          color: var(--md-sys-color-on-surface);
        }
        .drop-sub {
          font-size: 0.85rem;
          color: var(--md-sys-color-on-surface-variant);
          margin-top: 4px;
        }
        .history-heading {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--md-sys-color-on-surface-variant);
          margin-bottom: 12px;
        }
        .empty-files {
          padding: 24px;
          text-align: center;
          color: var(--md-sys-color-on-surface-variant);
          background-color: var(--md-sys-color-surface-container-low);
          border-radius: var(--radius-md);
          font-size: 0.9rem;
        }
        .file-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 12px;
        }
        .file-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background-color: var(--md-sys-color-surface-container-lowest);
          border-radius: var(--radius-md);
          border: 1px solid rgba(0, 0, 0, 0.04);
        }
        .file-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          background-color: var(--md-sys-color-surface-container-high);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--md-sys-color-secondary);
          flex-shrink: 0;
        }
        .file-details {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .file-name {
          font-size: 0.9rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .file-meta-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: var(--md-sys-color-on-surface-variant);
        }
        .source-pill {
          padding: 1px 6px;
          border-radius: var(--radius-full);
          font-size: 0.7rem;
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
        .dl-btn {
          padding: 6px 12px;
          font-size: 0.8rem;
          border-radius: var(--radius-full);
        }
      `}</style>
    </section>
  );
}
