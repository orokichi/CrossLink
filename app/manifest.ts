import type { MetadataRoute } from 'next';

/**
 * PWA manifest, served by Next.js at /manifest.webmanifest
 * (installability: name, short_name, start_url, display, 192px + 512px icons, service worker)
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CrossLink — Phone Link for Web',
    short_name: 'CrossLink',
    description:
      'AndroidスマートフォンとWebをシームレスに連携。クリップボード同期、ファイル転送、通知ミラーリング、写真ライブラリの閲覧をひとつに。',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
    orientation: 'any',
    background_color: '#f4faf9',
    theme_color: '#006a6a',
    lang: 'ja',
    dir: 'ltr',
    categories: ['productivity', 'utilities'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: '写真ライブラリ',
        short_name: '写真',
        description: 'スマートフォンの写真をブラウザで閲覧',
        url: '/?tab=photos',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'クリップボード',
        short_name: 'クリップボード',
        description: 'スマートフォンとテキストを同期',
        url: '/?tab=clipboard',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  };
}
