import { getDailyKural } from "@/lib/kurals";
import KuralCard from "@/components/KuralCard";
import type { Kural } from "@/lib/types";

export const revalidate = 60;

export default async function Home() {
  const kural = (await getDailyKural()) as Kural;

  return <KuralCard initialKural={kural} dailyKuralId={kural.id} />;
}
