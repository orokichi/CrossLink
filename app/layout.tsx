import type { Metadata, Viewport } from 'next';
import './globals.css';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cross-link-three.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'CrossLink — Phone Link for Web (Material 3 Expressive)',
    template: '%s · CrossLink',
  },
  description:
    'AndroidスマートフォンとWebをシームレスに連携。リアルタイムのクリップボード同期、ファイル転送、通知ミラーリング、写真ライブラリの閲覧をひとつの画面で。',
  applicationName: 'CrossLink',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'CrossLink',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  formatDetection: { telephone: false },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4faf9' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1514' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
