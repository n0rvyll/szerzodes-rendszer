import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Szerződés Tablet Rendszer',
  description: 'Ügyfél szerződésolvasó felület',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
