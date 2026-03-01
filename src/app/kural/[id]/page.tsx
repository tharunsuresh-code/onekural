import { notFound } from "next/navigation";
import { getKural } from "@/lib/kurals";
import KuralDetailCard from "@/components/KuralDetailCard";

interface Props {
  params: { id: string };
}

export default async function KuralDetailPage({ params }: Props) {
  const id = parseInt(params.id, 10);
  if (isNaN(id) || id < 1 || id > 1330) notFound();

  let kural;
  try {
    kural = await getKural(id);
  } catch {
    notFound();
  }

  return <KuralDetailCard initialKural={kural} />;
}
