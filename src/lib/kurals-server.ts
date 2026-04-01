/**
 * Server-only kural helpers — uses Node.js `fs` to read the local JSON file.
 * Never import this from client components (it will fail to bundle).
 */
import "server-only";
import { readFileSync } from "fs";
import { join } from "path";
import type { Kural } from "./types";
import { getDailyKuralId, getTodayLocal } from "./kurals";

let _kuralMap: Map<number, Kural> | null = null;

function getKuralMap(): Map<number, Kural> {
  if (_kuralMap) return _kuralMap;
  const raw = readFileSync(join(process.cwd(), "public/data/kurals.json"), "utf-8");
  const kurals = JSON.parse(raw) as Kural[];
  _kuralMap = new Map(kurals.map((k) => [k.id, k]));
  return _kuralMap;
}

export function getKuralLocalById(id: number): Kural {
  const kural = getKuralMap().get(id);
  if (!kural) throw new Error(`Kural ${id} not found in local data`);
  return kural;
}

export function getDailyKuralLocal(date: string = getTodayLocal()): Kural {
  return getKuralLocalById(getDailyKuralId(date));
}
