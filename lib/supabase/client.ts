import { createBrowserClient } from "@supabase/ssr";

// クライアントコンポーネントから利用する Supabase クライアント。
// 匿名認証 + ニックネームの設計なので anon key でアクセスする。
//
// WHY シングルトン: フックやページ遷移ごとに createClient() が呼ばれると
// GoTrueClient が多重生成され、警告 + Realtime チャネルが無駄に増えて
// 無料枠の同時接続上限を圧迫する。ブラウザ内では1インスタンスを使い回す。
//
// WHY make() 経由: 型は実呼び出しから推論させる。`ReturnType<typeof
// createBrowserClient>` を直接使うとジェネリック既定で型が緩くなり、
// クエリ結果が any になるため。
function make() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

let browserClient: ReturnType<typeof make> | undefined;

export function createClient() {
  return (browserClient ??= make());
}

let authPromise: Promise<void> | undefined;

// 端末ごとに匿名セッション(JWT)を保証する。
//
// WHY: 認証が無いと全リクエストが anon ロールになり、RLS で
// 「自分が参加したセッションだけ書き込み可」と絞れない。匿名サインインで
// 端末ごとに auth.uid() を持たせると、参加済みセッションのみに
// 書き込みを限定できる(migrations/007_anon_auth_rls.sql 参照)。
//
// WHY memoize: 複数のフック・画面が同時に呼んでもサインインは1回だけにする。
// WHY 失敗しても throw しない: 匿名サインイン未有効などで失敗しても
// アプリは止めない。移行期間は旧 RLS(anon 許可)で従来どおり動作する。
export function ensureAnonAuth(): Promise<void> {
  const supabase = createClient();
  return (authPromise ??= (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) return;
      const { error } = await supabase.auth.signInAnonymously();
      if (error) console.warn("匿名サインインに失敗:", error.message);
    } catch (e) {
      console.warn("匿名サインイン処理で例外:", e);
    }
  })());
}
