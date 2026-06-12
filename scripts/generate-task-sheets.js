// data/steps.json から、各タスク(ステップ)を A4 印刷できる自己完結 HTML に出力する。
// スマホが使えない人向けの紙版。アプリの mission 画面と同じ子ども向けテイスト＋ふりがな。
//   出力: docs/task-sheets/<id>.html (1タスク1ファイル) + index.html + _all.html(一括印刷用)
//   使い方: node scripts/generate-task-sheets.js
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const steps = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "steps.json"), "utf8"),
).steps;

// 役割ごとの色(アプリの役割色に対応・印刷でコントラストが出る濃さに調整)
const ROLES = {
  uketsuke: { name: "そうむ", bar: "#EA580C", tint: "#FFF7ED", ink: "#7C2D12" },
  oheya: { name: "しせつ", bar: "#D97706", tint: "#FFFBEB", ink: "#78350F" },
  monosuke: { name: "みずとたべもの", bar: "#0284C7", tint: "#F0F9FF", ink: "#0C4A6E" },
  kyugo: { name: "けんこう", bar: "#DC2626", tint: "#FEF2F2", ink: "#7F1D1D" },
};
const ORDER = ["uketsuke", "oheya", "monosuke", "kyugo"];
const PHASES = { 0: "せつえい", 1: "ごはん", 2: "よる", 3: "あさ" };

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// {漢字|よみ} を <ruby> に。それ以外は HTML エスケープ。
const ruby = (s) =>
  esc(s).replace(/\{([^|{}]+)\|([^|{}]+)\}/g, "<ruby>$1<rt>$2</rt></ruby>");
const stripRuby = (s) => String(s).replace(/\{([^|{}]+)\|[^|{}]+\}/g, "$1");

// 役割に依存しない共通CSS。役割色は roleVars() で .r-<role> にスコープして当てる。
const CSS_BASE = `
  *{box-sizing:border-box;}
  @page{size:A4 portrait;margin:0;}
  html,body{margin:0;padding:0;font-family:'Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif;color:#1f2937;}
  body{background:#e5e7eb;}
  .sheet{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:14mm 14mm 14mm;position:relative;}
  .band{color:#fff;border-radius:14px;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;}
  .band .role{font-size:26px;font-weight:800;}
  .band .blk{font-size:16px;opacity:.95;text-align:right;}
  .title{font-size:40px;font-weight:800;margin:22px 2px 6px;line-height:1.25;}
  .meta{font-size:16px;color:#6b7280;margin:0 2px 18px;}
  .lead{display:inline-block;font-weight:700;font-size:15px;border-radius:999px;padding:5px 14px;}
  ol.steps{list-style:none;margin:12px 0 4px;padding:0;}
  ol.steps li{display:flex;gap:14px;align-items:flex-start;border:1.5px solid #e5e7eb;border-radius:12px;padding:12px 14px;margin:10px 0;}
  ol.steps .n{flex:0 0 auto;width:34px;height:34px;border-radius:50%;color:#fff;font-weight:800;font-size:20px;display:flex;align-items:center;justify-content:center;}
  ol.steps .t{font-size:23px;line-height:1.4;padding-top:2px;}
  .box{border-radius:12px;padding:12px 16px;margin:14px 0;}
  .box .bt{font-size:14px;font-weight:800;margin-bottom:4px;}
  .box .bb{font-size:21px;line-height:1.4;}
  .point{background:#F0F9FF;border:1.5px solid #7DD3FC;}
  .point .bt{color:#0369A1;} .point .bb{color:#0C4A6E;font-size:18px;}
  .trouble{background:#FFFBEB;border:1.5px solid #FCD34D;}
  .trouble .bt{color:#92400E;margin-bottom:8px;}
  .tr{display:flex;align-items:center;gap:10px;font-size:18px;margin:6px 0;color:#78350F;}
  .tr .lab{font-weight:700;min-width:34%;}
  .tr .arr{color:#d97706;font-weight:800;}
  .check{margin:20px 2px 6px;font-size:30px;font-weight:800;}
  .check .cb{display:inline-block;border-radius:8px;width:34px;height:34px;vertical-align:-6px;margin-right:12px;}
  .foot{position:absolute;left:14mm;right:14mm;bottom:9mm;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:6px;}
  ruby rt{font-size:.5em;font-weight:400;}
  @media print{body{background:#fff;}.sheet{margin:0 auto;box-shadow:none;}}
`;
const roleVars = (role) => {
  const r = ROLES[role];
  const p = `.r-${role}`;
  return `
  ${p} .band{background:${r.bar};}
  ${p} .title{color:${r.ink};}
  ${p} .lead{background:${r.tint};color:${r.ink};}
  ${p} ol.steps .n{background:${r.bar};}
  ${p} .done{background:${r.tint};border:1.5px solid ${r.bar};}
  ${p} .done .bt,${p} .done .bb{color:${r.ink};}
  ${p} .check{color:${r.ink};}
  ${p} .check .cb{border:3px solid ${r.bar};}
`;
};

// 1タスクの中身(<div class="sheet">…</div>)を返す。
function sheetBody(step, idx, total) {
  const r = ROLES[step.role];
  const block = PHASES[step.phase];
  const instr = step.instructions
    .map(
      (t, i) =>
        `<li><span class="n">${i + 1}</span><span class="t">${ruby(t)}</span></li>`,
    )
    .join("");
  const troubles = (step.troubles || [])
    .map(
      (tr) =>
        `<div class="tr"><span class="lab">${ruby(tr.label)}</span><span class="arr">→</span><span class="act">${ruby(tr.action)}</span></div>`,
    )
    .join("");
  const point = step.point
    ? `<div class="box point"><div class="bt">💡 だいじなこと</div><div class="bb">${ruby(step.point)}</div></div>`
    : "";
  return `<div class="sheet r-${step.role}">
  <div class="band"><div class="role">${esc(r.name)}</div><div class="blk">${esc(block)}ブロック ・ やること ${idx}／${total}</div></div>
  <h1 class="title">${ruby(step.title)}</h1>
  <div class="meta">めやす ${step.duration_minutes} ふん</div>
  <div class="lead">いま やること</div>
  <ol class="steps">${instr}</ol>
  <div class="box done"><div class="bt">✓ できたサイン（これが できたら OK）</div><div class="bb">${ruby(step.completion_condition)}</div></div>
  ${point}
  ${troubles ? `<div class="box trouble"><div class="bt">こまった ときは</div>${troubles}</div>` : ""}
  <div class="check"><span class="cb"></span>できた！</div>
  <div class="foot">${esc(step.id)} ／ 親子で避難所体験 ・ 高梁青年会議所 ぼうさいキャンプ</div>
</div>`;
}

const page = (title, headStyle, body) =>
  `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${headStyle}</style></head>
<body>${body}</body></html>`;

// 役割→ブロック(phase)→order で並べ、役割内の通し番号を振る
const byRole = {};
for (const s of steps) (byRole[s.role] ||= []).push(s);
for (const role in byRole)
  byRole[role].sort((a, b) => a.phase - b.phase || a.order - b.order);

const OUT = path.join(ROOT, "docs", "task-sheets");
fs.mkdirSync(OUT, { recursive: true });

let count = 0;
const allParts = [];
for (const role of ORDER) {
  const list = byRole[role] || [];
  list.forEach((step, i) => {
    const body = sheetBody(step, i + 1, list.length);
    // 個別ファイル: 共通CSS + その役割のスコープCSSだけ
    fs.writeFileSync(
      path.join(OUT, `${step.id}.html`),
      page(
        `${stripRuby(step.title)}（${ROLES[role].name}）`,
        CSS_BASE + roleVars(role),
        body,
      ),
      "utf8",
    );
    count++;
    allParts.push(
      `<div style="page-break-after:always">${body}</div>`,
    );
  });
}

// _all.html(全タスクを page-break で連結・一括印刷用)。全役割のスコープCSSを入れる。
const allCss =
  CSS_BASE +
  ORDER.map(roleVars).join("") +
  "@media screen{.sheet{margin:8mm auto;box-shadow:0 2px 10px rgba(0,0,0,.2)}}";
fs.writeFileSync(
  path.join(OUT, "_all.html"),
  page(`タスク紙版 全${count}まい`, allCss, allParts.join("\n")),
  "utf8",
);

// index.html(役割ごとの一覧・各ファイルへのリンク)
const indexRows = ORDER.map((role) => {
  const r = ROLES[role];
  const items = byRole[role]
    .map(
      (s, i) =>
        `<li><a href="${s.id}.html"><b>${i + 1}.</b> ${esc(stripRuby(s.title))} <small>（${PHASES[s.phase]}）</small></a></li>`,
    )
    .join("");
  return `<section><h2 style="color:${r.ink};border-left:8px solid ${r.bar};padding-left:10px">${r.name} <small style="color:#9ca3af">${byRole[role].length}まい</small></h2><ol>${items}</ol></section>`;
}).join("");
fs.writeFileSync(
  path.join(OUT, "index.html"),
  `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>タスク紙版 一覧</title>
<style>body{font-family:'Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif;max-width:820px;margin:24px auto;padding:0 16px;color:#1f2937;}h1{color:#7C2D12}a{color:#0369a1;text-decoration:none;font-size:18px;line-height:2}a:hover{text-decoration:underline}section{margin:18px 0}ol{padding-left:22px}small{font-size:.8em}.note{background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;padding:12px 16px;color:#7C2D12}</style></head>
<body><h1>タスク 紙版（スマホが つかえない人 用）</h1>
<p class="note">各タスクは A4 1まいの 印刷用ページです。クリックして ひらき、ブラウザの「印刷」で A4 にだしてください。<br>ぜんぶ いちどに 印刷するなら → <a href="_all.html"><b>_all.html（全${count}まい）</b></a></p>
${indexRows}
<p style="color:#9ca3af;font-size:13px;margin-top:24px">自動生成: scripts/generate-task-sheets.js ／ data/steps.json（${count}タスク）</p>
</body></html>`,
  "utf8",
);

console.log(
  `generated ${count} task sheets + index.html + _all.html in docs/task-sheets/`,
);
