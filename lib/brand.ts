// 主催団体名・ブランド表記の一元管理。
//
// 元々「親子で避難所体験」固定だったが、JC キャンプ等の主催団体ごとに
// 名称・短縮形・配信ホスト を 環境変数で差し替えられるようにする。
//
// 環境変数:
//   NEXT_PUBLIC_BRAND_NAME   フル名称 (default: 「親子で避難所体験」)
//   NEXT_PUBLIC_BRAND_SHORT  PWA short_name 用 (default: 「避難所体験」)
//   NEXT_PUBLIC_BRAND_HOST   修了証フッターに出す配信ホスト
//                             (default: hinanjo-kids.vercel.app)
//
// クライアント側で読めるよう NEXT_PUBLIC_ プレフィックスを使う。

export const BRAND = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "親子で避難所体験",
  short: process.env.NEXT_PUBLIC_BRAND_SHORT ?? "避難所体験",
  host: process.env.NEXT_PUBLIC_BRAND_HOST ?? "hinanjo-kids.vercel.app",
} as const;
