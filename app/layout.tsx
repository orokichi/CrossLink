import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CrossLink — Phone Link for Web (Material 3 Expressive)',
  description: 'Seamlessly link your Android smartphone with the Web. Real-time clipboard sync, quick file transfers, notifications, and device controls.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
