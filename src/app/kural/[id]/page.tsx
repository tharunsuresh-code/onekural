import { notFound } from "next/navigation";
import Link from "next/link";
import { getKural } from "@/lib/kurals";
import { BOOK_NAMES } from "@/lib/types";
import type { Kural } from "@/lib/types";
import CommentarySection from "@/components/CommentarySection";
import KuralActions from "@/components/KuralActions";

interface Props {
  params: { id: string };
}

export default async function KuralDetailPage({ params }: Props) {
  const id = parseInt(params.id, 10);
  if (isNaN(id) || id < 1 || id > 1330) {
    notFound();
  }

  let kural: Kural;
  try {
    kural = await getKural(id);
  } catch {
    notFound();
  }

  const bookName = BOOK_NAMES[kural.book]?.english ?? "";
  const prevId = kural.id > 1 ? kural.id - 1 : 1330;
  const nextId = kural.id < 1330 ? kural.id + 1 : 1;

  return (
    <main className="max-w-content mx-auto px-6 pt-10 pb-24">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center text-sm text-dark/50 mb-6 hover:text-saffron transition-colors"
      >
        ← Back
      </Link>

      {/* Kural number + chapter */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-deep-red inline-block" />
          <span className="text-xs text-dark/50 tracking-wide">
            {bookName} · {kural.chapter_name_english}
          </span>
        </div>
        <span className="text-xs bg-saffron/10 text-saffron border border-saffron/30 rounded-full px-3 py-1 font-medium">
          #{kural.id}
        </span>
      </div>

      {/* Tamil text */}
      <p className="font-tamil text-2xl leading-loose text-dark whitespace-pre-line text-center mb-6">
        {kural.kural_tamil}
      </p>

      {/* Divider */}
      <div className="w-10 h-0.5 bg-saffron mb-6 rounded-full mx-auto" />

      {/* Transliteration */}
      <p className="text-sm text-dark/60 italic whitespace-pre-line leading-relaxed text-center mb-6">
        {kural.transliteration}
      </p>

      {/* Meaning */}
      <p className="text-base text-dark/80 leading-relaxed">
        {kural.meaning_english}
      </p>

      {/* Action buttons */}
      <KuralActions kural={kural} />

      {/* Commentaries */}
      <div className="mt-10"></div>
      <CommentarySection scholars={kural.scholars} />

      {/* Prev / Next navigation */}
      <div className="flex items-center justify-between mt-10 pt-4 border-t border-dark/10">
        <Link
          href={`/kural/${prevId}`}
          className="text-sm text-dark/50 hover:text-saffron transition-colors"
        >
          ← #{prevId}
        </Link>
        <Link
          href={`/kural/${nextId}`}
          className="text-sm text-dark/50 hover:text-saffron transition-colors"
        >
          #{nextId} →
        </Link>
      </div>
    </main>
  );
}
