// 班別QR掲示(A4縦)を生成する。docs/qr/qr-JCKIDSx.svg を埋め込んで自己完結SVGにする。
// 実行: node docs/qr/build-signs.mjs
import fs from "node:fs";

const dir = "docs/qr";
const groups = [
  { L: "A", code: "JCKIDSA", color: "#F97316" }, // オレンジ(ブランド)
  { L: "B", code: "JCKIDSB", color: "#0EA5E9" }, // 青
  { L: "C", code: "JCKIDSC", color: "#16A34A" }, // 緑
  { L: "D", code: "JCKIDSD", color: "#7C3AED" }, // 紫
];

// qrcode CLI が出力した SVG から、内側の <path> 2本だけ取り出す
function qrInner(code) {
  const s = fs.readFileSync(`${dir}/qr-${code}.svg`, "utf8");
  return s.slice(s.indexOf("<path"), s.lastIndexOf("</svg>"));
}

for (const g of groups) {
  const inner = qrInner(g.code);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 840 1188" role="img" aria-label="${g.L}グループ 参加QR掲示">
  <rect width="840" height="1188" fill="#FFF7ED"/>

  <!-- 上部おび(班カラー) -->
  <rect x="0" y="0" width="840" height="150" fill="${g.color}"/>
  <text x="420" y="98" text-anchor="middle" font-family="sans-serif" font-size="46" font-weight="bold" fill="#FFFFFF">ぼうさい たいけん うけつけ</text>

  <!-- 班バッジ -->
  <circle cx="150" cy="272" r="84" fill="${g.color}"/>
  <text x="150" y="272" text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-size="108" font-weight="bold" fill="#FFFFFF">${g.L}</text>
  <text x="266" y="252" font-family="sans-serif" font-size="70" font-weight="bold" fill="#1F2937">${g.L} グループ</text>
  <text x="268" y="314" font-family="sans-serif" font-size="32" fill="#6B7280">ふくち しょうがっこう ${g.L} はん</text>

  <!-- あんない -->
  <text x="420" y="438" text-anchor="middle" font-family="sans-serif" font-size="56" font-weight="bold" fill="#9A3412">ここを スマホで よんでね</text>
  <text x="420" y="486" text-anchor="middle" font-family="sans-serif" font-size="30" fill="#7C2D12">おうちの人と いっしょに よんでね</text>

  <!-- QR(埋め込み) -->
  <rect x="180" y="516" width="480" height="480" rx="20" fill="#FFFFFF" stroke="${g.color}" stroke-width="8"/>
  <svg x="210" y="546" width="420" height="420" viewBox="0 0 41 41" shape-rendering="crispEdges">${inner}</svg>

  <!-- コード(読めないとき用) -->
  <text x="420" y="1052" text-anchor="middle" font-family="sans-serif" font-size="30" fill="#7C2D12">よめない ときは ↓の コードを いれてね</text>
  <text x="420" y="1120" text-anchor="middle" font-family="monospace" font-size="80" font-weight="bold" fill="${g.color}" letter-spacing="6">${g.code}</text>
  <text x="420" y="1162" text-anchor="middle" font-family="monospace" font-size="26" fill="#9A3412">https://hinanjo-kids.vercel.app</text>
</svg>
`;
  fs.writeFileSync(`${dir}/sign-${g.code}.svg`, svg);
  console.log("wrote", `sign-${g.code}.svg`);
}
