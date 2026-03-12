/**
 * Export script — dumps all 1,330 kurals to public/data/kurals.json.
 *
 * Usage:
 *   npx ts-node --project tsconfig.seed.json scripts/export-data.ts
 *
 * Requires SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and
 * SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * The output file is committed to the repo and served as a static asset at
 * /data/kurals.json — useful for LLM agents, RAG pipelines, and bulk access
 * without hitting the live API.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function exportData() {
  console.log("Fetching all kurals from Supabase...");

  // Fetch in pages of 500 to stay within Supabase row limits
  const PAGE_SIZE = 500;
  const allKurals: unknown[] = [];
  let page = 0;

  while (true) {
    const { data, error } = await supabase
      .from("kurals")
      .select("id, book, chapter, chapter_name_tamil, chapter_name_english, kural_tamil, transliteration, meaning_english, meaning_tamil, scholars, themes, explanation_english, explanation_tamil")
      .order("id", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching kurals:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    allKurals.push(...data);
    console.log(`  Fetched ${allKurals.length} kurals...`);

    if (data.length < PAGE_SIZE) break;
    page++;
  }

  console.log(`Total kurals fetched: ${allKurals.length}`);

  const outputDir = path.join(process.cwd(), "public", "data");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "kurals.json");
  fs.writeFileSync(outputPath, JSON.stringify(allKurals, null, 2), "utf-8");
  console.log(`Exported to ${outputPath}`);
}

exportData().catch((err) => {
  console.error(err);
  process.exit(1);
});
