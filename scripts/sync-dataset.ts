#!/usr/bin/env npx tsx
/**
 * Sync data/kurals.csv → Supabase kurals table
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/sync-dataset.ts
 *
 * Called automatically by .github/workflows/sync-dataset.yml on push to main.
 */

import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";

const CSV_PATH = path.join(process.cwd(), "data", "kurals.csv");
const BATCH_SIZE = 100;

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

const raw = fs.readFileSync(CSV_PATH, "utf-8");
const rows = parse(raw, { columns: true, skip_empty_lines: true }) as Record<
  string,
  string
>[];

console.log(`Loaded ${rows.length} rows from ${CSV_PATH}`);

// Cast numeric fields
const records = rows.map((r) => ({
  id: Number(r.id),
  book: Number(r.book),
  chapter: Number(r.chapter),
  chapter_name_tamil: r.chapter_name_tamil || null,
  chapter_name_english: r.chapter_name_english || null,
  kural_tamil: r.kural_tamil || null,
  transliteration: r.transliteration || null,
  meaning_english: r.meaning_english || null,
  meaning_tamil: r.meaning_tamil || null,
  explanation_english: r.explanation_english || null,
  explanation_tamil: r.explanation_tamil || null,
}));

let updated = 0;
let errors = 0;

for (let i = 0; i < records.length; i += BATCH_SIZE) {
  const batch = records.slice(i, i + BATCH_SIZE);
  const { error } = await supabase
    .from("kurals")
    .upsert(batch, { onConflict: "id" });

  if (error) {
    console.error(`Batch ${i / BATCH_SIZE + 1} error:`, error.message);
    errors += batch.length;
  } else {
    updated += batch.length;
    process.stdout.write(`\rUpserted ${updated}/${records.length}...`);
  }
}

console.log(`\nDone. ${updated} upserted, ${errors} errors.`);
process.exit(errors > 0 ? 1 : 0);
