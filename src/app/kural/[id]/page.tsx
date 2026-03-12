import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getKural } from "@/lib/kurals";
import KuralCard from "@/components/KuralCard";
import { MAX_KURAL_ID } from "@/lib/constants";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseInt(params.id, 10);
  if (isNaN(id) || id < 1 || id > MAX_KURAL_ID) return {};

  let kural;
  try {
    kural = await getKural(id);
  } catch {
    return {};
  }

  const title = `Kural ${id} — ${kural.chapter_name_english} | OneKural`;
  const description = kural.meaning_english?.slice(0, 155) ?? "Read this Thirukkural verse with English meaning and Tamil commentary.";

  return {
    title,
    description,
    alternates: { canonical: `https://onekural.com/kural/${id}` },
    openGraph: {
      title,
      description,
      url: `https://onekural.com/kural/${id}`,
      type: "article",
    },
  };
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
