// ふりがな記法 {漢字|よみ} を解析するパーサー。
//
// 入力例: "うけつけの{机|つくえ}をおく"
// 出力:   [
//   { type: "text",  value: "うけつけの" },
//   { type: "ruby",  base: "机", rt: "つくえ" },
//   { type: "text",  value: "をおく" },
// ]
//
// 設計メモ:
// - 別ファイル辞書ではなく文字列内記法を採用した理由は、同じ漢字でも
//   文脈で読みが変わるケース(本=ほん / 本名=ほんみょう)を素直に書ける点。
// - エスケープ機能は省略。コンテンツに `{` `|` `}` が出てこない前提。
//   万一必要になったら `\\{` で逃がす仕様を後付けすればよい。

export type RubyToken =
  | { type: "text"; value: string }
  | { type: "ruby"; base: string; rt: string };

// WHY exec ループ:tsconfig の target が ES5 なので String#matchAll が使えない。
// グローバル RegExp を毎回新規生成して lastIndex 副作用を避ける。
const RUBY_RE_SRC = "\\{([^{|}]+)\\|([^{|}]+)\\}";

export function parseRuby(text: string): RubyToken[] {
  const tokens: RubyToken[] = [];
  const re = new RegExp(RUBY_RE_SRC, "g");
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const start = m.index;
    if (start > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    tokens.push({ type: "ruby", base: m[1], rt: m[2] });
    lastIndex = start + m[0].length;
  }
  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }
  return tokens;
}

// 記法を取り除いて素のテキストだけ返す(aria-label や検索用に使う)。
export function stripRuby(text: string): string {
  return text.replace(new RegExp(RUBY_RE_SRC, "g"), (_m, base) => base);
}
