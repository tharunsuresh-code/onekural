"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
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

interface FavoritesContextValue {
  favorites: number[];
  loaded: boolean;
  isFavorite: (id: number) => boolean;
  toggleFavorite: (id: number) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue>({
  favorites: [],
  loaded: false,
  isFavorite: () => false,
  toggleFavorite: async () => {},
});

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Prevents duplicate Supabase fetches when auth re-fires for the same user
  // (e.g. TOKEN_REFRESHED). undefined = not yet loaded for any user.
  const loadedForRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const userId = user?.id ?? null;
    if (loadedForRef.current === userId) return;
    loadedForRef.current = userId;
    setLoaded(false);

    if (user) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from("favorites")
            .select("kural_id")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (error) throw error;

          const remoteFavs = (data ?? []).map((r) => r.kural_id);
          const localFavs = getLocalFavorites();

          const toInsert = localFavs.filter((id) => !remoteFavs.includes(id));
          if (toInsert.length > 0) {
            await supabase.from("favorites").insert(
              toInsert.map((kural_id) => ({ user_id: user.id, kural_id }))
            );
            localStorage.removeItem(STORAGE_KEY);
          } else if (localFavs.length > 0) {
            localStorage.removeItem(STORAGE_KEY);
          }

          setFavorites(Array.from(new Set([...remoteFavs, ...toInsert])));
        } catch {
          // Offline or error — show local favorites so UI is functional
          setFavorites(getLocalFavorites());
        } finally {
          setLoaded(true);
        }
      })();
    } else {
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
        // Optimistic update — revert on error
        if (isFav) {
          setFavorites((prev) => prev.filter((f) => f !== id));
          const { error } = await supabase
            .from("favorites")
            .delete()
            .eq("user_id", user.id)
            .eq("kural_id", id);
          if (error) setFavorites((prev) => [id, ...prev]);
        } else {
          setFavorites((prev) => [id, ...prev]);
          const { error } = await supabase
            .from("favorites")
            .insert({ user_id: user.id, kural_id: id });
          if (error) setFavorites((prev) => prev.filter((f) => f !== id));
        }
      } else {
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

  return (
    <FavoritesContext.Provider
      value={{ favorites, loaded, isFavorite, toggleFavorite }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
