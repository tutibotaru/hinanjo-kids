// audience_mode (family / kids) に応じた文言テーブル。
//
// family = 親子で参加する体験キャンプ (既存)
// kids   = 子どもだけ + おとなリーダーで運営するキャンプ(JC など)
//
// なぜ Context ではなく単純な関数呼び出しか:
// - audience_mode は session 単位で固定 = ページごとに 1 回読めば良い
// - ふりがな ON/OFF と違ってトグルされないので reactive 不要

export type AudienceMode = "family" | "kids";

export function normalizeAudienceMode(value: unknown): AudienceMode {
  return value === "kids" ? "kids" : "family";
}

type Phrases = {
  // ヘッダー類
  brandSubtitle: string;          // top: 「親子で 避難所 体験」 等
  brandCertificateLine: string;   // 修了証: 主催文言
  // CTA / 案内文
  joinInvite: string;             // 「いっしょに 参加」 / 「みんなで さんか」
  joinDescription: string;        // top のサブテキスト
  // 災害時の「誰に聞くか」
  emergencyAuthority: string;     // family→「おうちの 人」 / kids→「リーダー」
  // チームを 1 つ作るとき
  inviteHeading: string;          // 招待ヘッダー
  // 修了証本文の協力者
  certificatePartner: string;     // 「{団体名}と いっしょに ひなんじょの たちあげ」
};

export const FAMILY_PHRASES: Phrases = {
  brandSubtitle: "親子で 避難所 体験",
  brandCertificateLine: "おやこで ひなんじょ たいけん",
  joinInvite: "いっしょに さんか",
  joinDescription:
    "QR コードを よんで、おうちの 人と いっしょに 避難所を 立ちあげてみよう。 やくわりを えらんで、 ステップに そって うごくだけ。",
  emergencyAuthority: "おとなや まちの 人",
  inviteHeading: "ともだちを しょうたい",
  certificatePartner: "おうちの 人と いっしょに",
};

export const KIDS_PHRASES: Phrases = {
  brandSubtitle: "みんなで 避難所 たいけん",
  brandCertificateLine: "みんなで ひなんじょ たいけん",
  joinInvite: "みんなで さんか",
  joinDescription:
    "QR コードを よんで、 チームの ともだちと いっしょに 避難所を 立ちあげてみよう。 やくわりを えらんで、 ステップに そって うごくだけ。 こまったら リーダーに きいてね。",
  emergencyAuthority: "リーダーや まちの 人",
  inviteHeading: "ともだちを よぶ",
  certificatePartner: "チームのともだちと いっしょに",
};

export function phrases(mode: AudienceMode | undefined | null): Phrases {
  return normalizeAudienceMode(mode) === "kids" ? KIDS_PHRASES : FAMILY_PHRASES;
}
