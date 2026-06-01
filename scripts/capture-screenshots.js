// アプリ画面スクショ一括取得（Canva 使い方ガイド用）
// 使い方: 開発サーバ(localhost:3001)を起動した状態で
//   node scripts/capture-screenshots.js
// 出力: public/screenshots/*.png（mobile 375px / 2x）
// 注意: JCKIDS サンプルにテスト参加者を作るので、デモ前に manage で「ぜんぶ もとに もどす」推奨。

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const BASE = process.env.BASE_URL || "http://localhost:3001";
const CODE = "JCKIDS";
const OUT = path.join(__dirname, "..", "public", "screenshots");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function goto(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await sleep(1300); // クライアント描画・データ取得待ち
}

async function waitPath(page, sub) {
  await page
    .waitForFunction((s) => location.pathname.includes(s), { timeout: 8000 }, sub)
    .catch(() => {});
  await sleep(1200);
}

async function clickByText(page, texts) {
  return page.evaluate((arr) => {
    const btns = [...document.querySelectorAll("button, a")];
    for (const t of arr) {
      const el = btns.find((b) => b.textContent.trim() === t || b.textContent.includes(t));
      if (el) { el.click(); return el.textContent.trim().slice(0, 20); }
    }
    return null;
  }, texts);
}

async function shot(page, name, full = false) {
  await sleep(500);
  await page.screenshot({ path: path.join(OUT, name + ".png"), fullPage: full });
  console.log("  ✓ " + name + ".png");
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });

  const step = async (label, fn) => {
    try {
      console.log("» " + label);
      await fn();
    } catch (e) {
      console.log("  ! " + label + " 失敗: " + e.message);
    }
  };

  // 状態クリア
  await goto(page, BASE + "/");
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });

  // 1. トップ
  await step("top", async () => {
    await goto(page, BASE + "/");
    await shot(page, "app-top");
  });

  // 2. ニックネーム
  await step("nickname", async () => {
    await goto(page, `${BASE}/s/${CODE}/nickname`);
    await shot(page, "nickname");
  });

  // 参加者を作成 → /role へ
  await step("join", async () => {
    await page.type("input", "ゆうき");
    await clickByText(page, ["つぎへ"]);
    await waitPath(page, "/role");
  });

  // 3. 役割しつもん（Q1）
  await step("role-quiz", async () => {
    await shot(page, "role-quiz");
  });

  // 4問回答
  await step("answer", async () => {
    for (let i = 0; i < 4; i++) {
      await clickByText(page, ["すき", "できる"]);
      await sleep(800);
    }
    await sleep(800);
  });

  // 4. おすすめ役割
  await step("role-recommend", async () => {
    await shot(page, "role-recommend");
  });

  // 役割を選ぶ → /mission
  await step("pick-role", async () => {
    await clickByText(page, ["おへやづくり"]);
    await waitPath(page, "/mission");
  });

  // 5. ミッション
  await step("mission", async () => {
    await shot(page, "mission");
  });

  // 6. こまった展開（理由ボタンが下に出るのでスクロールして見せる）
  await step("mission-komatta", async () => {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find(
        (x) => x.textContent.trim() === "こまった",
      );
      if (b) b.click();
    });
    await sleep(900);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(500);
    await shot(page, "mission-komatta");
    // キャンセルして戻す
    await clickByText(page, ["キャンセル"]);
    await sleep(400);
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(300);
  });

  // 進捗を少し進める（finish の数字を出すため）
  await step("progress", async () => {
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        const b = [...document.querySelectorAll("button")].find((x) =>
          x.textContent.includes("できた!"),
        );
        if (b) b.click();
      });
      await sleep(900);
    }
  });

  // 7. ボード
  await step("board", async () => {
    await goto(page, `${BASE}/s/${CODE}/board`);
    await shot(page, "board");
  });

  // 8. ひろば
  await step("posts", async () => {
    await goto(page, `${BASE}/s/${CODE}/posts`);
    await shot(page, "posts");
  });

  // 9. おつかれさま（finish）— 上部の達成感 ＋ ふりかえりフォームの2枚
  await step("finish", async () => {
    await goto(page, `${BASE}/s/${CODE}/finish`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(400);
    await shot(page, "finish"); // 上部: ⭐ おつかれさま＋スコア
    await page.evaluate(() => {
      const ta = document.querySelector("textarea");
      if (ta) ta.scrollIntoView({ block: "center" });
    });
    await sleep(700);
    await shot(page, "finish-reflection"); // ふりかえり投稿フォーム
  });

  // 10. 修了証（証書部分だけを切り出し・ブラウザのヘッダーを除く）
  await step("certificate", async () => {
    await goto(page, `${BASE}/s/${CODE}/certificate`);
    const el = await page.$("article");
    if (el) {
      await el.screenshot({ path: path.join(OUT, "certificate.png") });
      console.log("  ✓ certificate.png (article)");
    } else {
      await shot(page, "certificate", true);
    }
  });

  await browser.close();
  console.log("DONE");
})();
