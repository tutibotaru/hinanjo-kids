import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NicknameForm from "./nickname-form";

export default async function NicknamePage({
  params,
}: {
  params: { code: string };
}) {
  const code = params.code.toUpperCase();
  const supabase = createClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("id, name, qr_code, phase, mode")
    .eq("qr_code", code)
    .maybeSingle();

  if (!session) notFound();

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-md">
        <header className="mb-8">
          <p className="text-xs font-semibold tracking-widest text-emerald-700">
            参加先
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {session.name}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            コード{" "}
            <code className="rounded bg-slate-200 px-1.5 py-0.5">
              {session.qr_code}
            </code>
            {" / "}
            {session.mode === "training" ? "訓練モード" : "本番モード"}
          </p>
        </header>

        <NicknameForm sessionId={session.id} sessionCode={session.qr_code} />
      </div>
    </main>
  );
}
