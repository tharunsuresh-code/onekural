import { getDailyKuralLocal } from "@/lib/kurals-server";
import KuralCard from "@/components/KuralCard";
import type { Kural } from "@/lib/types";
import { MS_PER_DAY } from "@/lib/constants";

export const revalidate = 86400;

export default async function Home() {
  // Server runs in UTC. Users in UTC± timezones may have a different local date.
  // Prefetch adjacent days so the client can correct instantly without a network fetch.
  const now = Date.now();
  const toDate = (ms: number) => new Date(ms).toLocaleDateString("en-CA");
  const [prevKural, todayKural, nextKural] = [
    getDailyKuralLocal(toDate(now - MS_PER_DAY)),
    getDailyKuralLocal(toDate(now)),
    getDailyKuralLocal(toDate(now + MS_PER_DAY)),
  ];

  const adjacentKurals: Record<string, Kural> = {
    [toDate(now - MS_PER_DAY)]: prevKural,
    [toDate(now)]: todayKural,
    [toDate(now + MS_PER_DAY)]: nextKural,
  };

  return (
    <KuralCard
      initialKural={todayKural}
      mode="home"
      dailyKuralId={todayKural.id}
      adjacentKurals={adjacentKurals}
    />
  );
}

