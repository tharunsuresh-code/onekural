"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

const STORAGE_KEY = "kural-favorites";

function getLocalFavorites(): number[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function setLocalFavorites(ids: number[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load favorites
  useEffect(() => {
    if (user) {
      // Logged in: load from Supabase, merge localStorage, clear localStorage
      (async () => {
        const { data } = await supabase
          .from("favorites")
          .select("kural_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        const remoteFavs = (data ?? []).map((r) => r.kural_id);
        const localFavs = getLocalFavorites();

        // Merge: add any local favorites not already in remote
        const toInsert = localFavs.filter((id) => !remoteFavs.includes(id));
        if (toInsert.length > 0) {
          await supabase.from("favorites").insert(
            toInsert.map((kural_id) => ({ user_id: user.id, kural_id }))
          );
          // Clear localStorage after successful merge
          localStorage.removeItem(STORAGE_KEY);
        } else if (localFavs.length > 0) {
          localStorage.removeItem(STORAGE_KEY);
        }

        const merged = Array.from(new Set([...remoteFavs, ...toInsert]));
        setFavorites(merged);
        setLoaded(true);
      })();
    } else {
      // Anonymous: load from localStorage
      setFavorites(getLocalFavorites());
      setLoaded(true);
    }
  }, [user]);

  const isFavorite = useCallback(
    (id: number) => favorites.includes(id),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (id: number) => {
      const isFav = favorites.includes(id);

      if (user) {
        // Supabase
        if (isFav) {
          await supabase
            .from("favorites")
            .delete()
            .eq("user_id", user.id)
            .eq("kural_id", id);
          setFavorites((prev) => prev.filter((f) => f !== id));
        } else {
          await supabase
            .from("favorites")
            .insert({ user_id: user.id, kural_id: id });
          setFavorites((prev) => [id, ...prev]);
        }
      } else {
        // localStorage
        if (isFav) {
          const next = favorites.filter((f) => f !== id);
          setFavorites(next);
          setLocalFavorites(next);
        } else {
          const next = [id, ...favorites];
          setFavorites(next);
          setLocalFavorites(next);
        }
      }
    },
    [favorites, user]
  );

  return { favorites, isFavorite, toggleFavorite, loaded };
}
