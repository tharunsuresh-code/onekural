#!/usr/bin/env npx tsx
/**
 * Sync public/data/kurals.json → Supabase kurals table
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/sync-dataset.ts
 *
 * Called automatically by .github/workflows/sync-dataset.yml on push to main.
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const JSON_PATH = path.join(process.cwd(), "public", "data", "kurals.json");
const BATCH_SIZE = 100;

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

const records = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));

console.log(`Loaded ${records.length} records from ${JSON_PATH}`);

async function main() {
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
}

main();
