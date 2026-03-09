import { notFound } from "next/navigation";
import { getKural } from "@/lib/kurals";
import KuralCard from "@/components/KuralCard";
import { MAX_KURAL_ID } from "@/lib/constants";

interface Props {
  params: { id: string };
}

export default async function KuralDetailPage({ params }: Props) {
  const id = parseInt(params.id, 10);
  if (isNaN(id) || id < 1 || id > MAX_KURAL_ID) notFound();

  let kural;
  try {
    kural = await getKural(id);
  } catch {
    notFound();
  }

  return <KuralCard initialKural={kural} />;
}
