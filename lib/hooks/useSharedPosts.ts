"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SharedPost } from "@/lib/types/database";

// 共有タイムラインを購読する。新着が配列の先頭に来る順。
export function useSharedPosts(sessionId: string | null) {
  const [posts, setPosts] = useState<SharedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    setLoading(true);
    setError(null);

    supabase
      .from("shared_posts")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        else setPosts((data ?? []) as SharedPost[]);
        setLoading(false);
      });

    // WHY filter なし: DELETE イベントを取りこぼさないため
    // (useStepProgress と同じ理由。詳細はそちらのコメント参照)。
    const channel = supabase
      .channel(`shared-posts-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shared_posts" },
        (payload) => {
          if (cancelled) return;
          setPosts((current) => {
            if (payload.eventType === "DELETE") {
              const removedId = (payload.old as { id?: string }).id;
              if (!removedId) return current;
              return current.filter((p) => p.id !== removedId);
            }
            const row = payload.new as SharedPost;
            if (row.session_id !== sessionId) return current;
            if (payload.eventType === "INSERT") {
              if (current.some((p) => p.id === row.id)) return current;
              return [row, ...current];
            }
            if (payload.eventType === "UPDATE") {
              return current.some((p) => p.id === row.id)
                ? current.map((p) => (p.id === row.id ? row : p))
                : [row, ...current];
            }
            return current;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return { posts, loading, error };
}
