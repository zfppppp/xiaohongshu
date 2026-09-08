import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'BriefLab · 内容经营工作台',
  description:
    '免登录的内容经营工作台。创建项目、整理证据、编写简报、安排任务和复盘数据。',
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
