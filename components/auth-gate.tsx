"use client";

import { useEffect, useState } from "react";
import { ensureAnonAuth } from "@/lib/supabase/client";

// アプリ全体を包み、匿名サインインが済むまで子を描画しない。
//
// WHY: 先に端末の匿名 JWT を確立しておけば、以降の全ての読み書きが
// authenticated ロールで実行され、RLS のセッション単位の保護が効く。
// 各画面・フックを個別に書き換えずに、この1か所だけで吸収できる。
//
// WHY 失敗時も描画する: サインインが失敗・遅延してもアプリを絶対に
// ロックさせない。保険として最大 4 秒で必ず子を描画する。
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      setReady(true);
    };
    ensureAnonAuth().finally(finish);
    const timer = setTimeout(finish, 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-gray-500">準備中…</p>
      </div>
    );
  }

  return <>{children}</>;
}
