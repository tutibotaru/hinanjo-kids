"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function BottomNav({
  code,
  sessionId,
}: {
  code: string;
  sessionId: string | null;
}) {
  const pathname = usePathname();
  const [hasUnread, setHasUnread] = useState(false);

  const onPosts = pathname.endsWith("/posts");

  useEffect(() => {
    if (!sessionId) return;
    const supabase = createClient();
    let cancelled = false;

    const lastSeen = localStorage.getItem(`hinanjo:lastSeen:${code}:posts`);

    supabase
      .from("shared_posts")
      .select("created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (onPosts) {
          localStorage.setItem(
            `hinanjo:lastSeen:${code}:posts`,
            new Date().toISOString(),
          );
          setHasUnread(false);
          return;
        }
        if (!data) {
          setHasUnread(false);
          return;
        }
        if (
          !lastSeen ||
          new Date(data.created_at).getTime() > new Date(lastSeen).getTime()
        ) {
          setHasUnread(true);
        } else {
          setHasUnread(false);
        }
      });

    const channel = supabase
      .channel(`bottom-nav-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "shared_posts",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          if (cancelled) return;
          if (onPosts) {
            localStorage.setItem(
              `hinanjo:lastSeen:${code}:posts`,
              new Date().toISOString(),
            );
          } else {
            setHasUnread(true);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [sessionId, code, onPosts]);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-md grid-cols-3">
        <NavTab
          href={`/s/${code}/mission`}
          label="マイ"
          active={pathname.endsWith("/mission")}
        />
        <NavTab
          href={`/s/${code}/board`}
          label="全体"
          active={pathname.endsWith("/board")}
        />
        <NavTab
          href={`/s/${code}/posts`}
          label="共有"
          active={onPosts}
          hasUnread={hasUnread}
        />
      </div>
    </nav>
  );
}

function NavTab({
  href,
  label,
  active,
  hasUnread,
}: {
  href: string;
  label: string;
  active: boolean;
  hasUnread?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{ minHeight: 56 }}
      className={`flex items-center justify-center text-sm font-semibold transition-colors ${
        active
          ? "border-t-2 border-emerald-500 text-emerald-700"
          : "border-t-2 border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      <span className="relative inline-block">
        {label}
        {hasUnread && (
          <span
            aria-label="新着あり"
            className="absolute -right-3 -top-1 h-2 w-2 rounded-full bg-rose-500"
          />
        )}
      </span>
    </Link>
  );
}
