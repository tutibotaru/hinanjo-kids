import { Fragment } from "react";
import { parseRuby } from "@/lib/ruby";

// 記法 {漢字|よみ} を含む文字列を <ruby> 付きで描画する。
// 行内要素として振る舞うので、<p> や <h1> の中にそのまま入れて使う。
export default function RubyText({ text }: { text: string }) {
  const tokens = parseRuby(text);
  return (
    <>
      {tokens.map((t, i) => {
        if (t.type === "text") {
          return <Fragment key={i}>{t.value}</Fragment>;
        }
        return (
          <ruby key={i}>
            {t.base}
            <rt>{t.rt}</rt>
          </ruby>
        );
      })}
    </>
  );
}
