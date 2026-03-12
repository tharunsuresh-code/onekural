/**
 * Export script — converts data/kurals.csv to public/data/kurals.json.
 *
 * Usage:
 *   npx ts-node --project tsconfig.seed.json scripts/export-data.ts
 *
 * No environment variables required — reads from the local CSV file.
 *
 * The output file is committed to the repo and served as a static asset at
 * /data/kurals.json — useful for LLM agents, RAG pipelines, and bulk access
 * without hitting the live API.
 */

import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const CSV_PATH = path.join(process.cwd(), "data", "kurals.csv");
const OUTPUT_PATH = path.join(process.cwd(), "public", "data", "kurals.json");

const raw = fs.readFileSync(CSV_PATH, "utf-8");
const rows = parse(raw, { columns: true, skip_empty_lines: true }) as Record<string, string>[];

console.log(`Loaded ${rows.length} rows from ${CSV_PATH}`);

const kurals = rows.map((r) => ({
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
  scholars: [],
  themes: [],
}));

const outputDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(kurals, null, 2), "utf-8");
console.log(`Exported ${kurals.length} kurals to ${OUTPUT_PATH}`);
