import type { Metadata } from "next";

// WHY: 管理(セッション作成・QR発行)は運営者専用導線。
// 検索エンジンにインデックスさせない。
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
