import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '行政事業レビュー サンキー図',
  description: '行政事業レビューの予算・執行データをサンキー図で可視化',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
