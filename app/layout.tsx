import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '种草证据台 BriefLab | 轻薄本内容决策',
  description:
    '从真实用户问题到带来源的内容简报，再到可复算的实验复盘。周枫浦的商业运营求职项目。',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
