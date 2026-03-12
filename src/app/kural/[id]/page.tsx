import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getKural } from "@/lib/kurals";
import KuralCard from "@/components/KuralCard";
import { MAX_KURAL_ID } from "@/lib/constants";
import { BOOK_NAMES } from "@/lib/types";

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

  const bookName = BOOK_NAMES[kural.book]?.english ?? "Thirukkural";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `https://onekural.com/kural/${id}`,
    name: `Kural ${id} — ${kural.chapter_name_english}`,
    author: { "@type": "Person", name: "Thiruvalluvar" },
    inLanguage: ["ta", "en"],
    isPartOf: {
      "@type": "Book",
      name: "Thirukkural",
      bookEdition: bookName,
    },
    text: kural.kural_tamil,
    alternateName: kural.transliteration,
    abstract: kural.meaning_english,
    description: kural.meaning_tamil,
    url: `https://onekural.com/kural/${id}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <KuralCard initialKural={kural} />
    </>
  );
}
