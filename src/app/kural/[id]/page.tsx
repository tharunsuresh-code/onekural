import { notFound } from "next/navigation";
import { getKural } from "@/lib/kurals";
import KuralCard from "@/components/KuralCard";

// TODO: once kural data is stable (no more bulk explanation updates), remove
// force-dynamic and re-enable static generation with generateStaticParams.
export const dynamic = "force-dynamic";

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

  return <KuralCard initialKural={kural} />;
}
