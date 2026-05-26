import type { Metadata } from "next";

// WHY: セッション配下(/s/<code>/...)は特定避難所の運用画面。
// 検索エンジンにインデックスさせない(コード・参加者情報の露出防止)。
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function SessionScopeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
