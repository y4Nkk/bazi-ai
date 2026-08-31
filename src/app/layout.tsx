import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "命轨 Bazi AI · 传统命理趋势工作台",
  description:
    "可复现的传统八字趋势排盘：四柱、大运与传统命理趋势指数，可选自带密钥的 AI 解读。文化娱乐用途。",
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
