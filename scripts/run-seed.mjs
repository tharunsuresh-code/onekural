import pg from "pg";

const DB = process.argv[2];
const client = new pg.Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${url} → ${res.status}`);
  return res.json();
}

function buildChapterMap(detailRoot) {
  // Structure: detailRoot[0].section.detail[] → books
  //   → .chapterGroup.detail[] → chapter groups
  //     → .chapters.detail[] → individual chapters { name, translation, number, start, end }
  const map = new Map();
  const books = detailRoot[0].section.detail; // 3 books
  for (const book of books) {
    const bookNum = book.number; // 1=Aram, 2=Porul, 3=Inbam
    for (const group of book.chapterGroup.detail) {
      for (const ch of group.chapters.detail) {
        for (let k = ch.start; k <= ch.end; k++) {
          map.set(k, {
            chapter: ch.number,
            chapter_name_tamil: ch.name,
            chapter_name_english: ch.translation,
            book: bookNum,
          });
        }
      }
    }
  }
  return map;
}

await client.connect();
console.log("Connected. Fetching kural data...");

const [kuralRoot, detailRoot] = await Promise.all([
  fetchJSON("https://raw.githubusercontent.com/tk120404/thirukkural/master/thirukkural.json"),
  fetchJSON("https://raw.githubusercontent.com/tk120404/thirukkural/master/detail.json"),
]);

const rawKurals = kuralRoot.kural;
const chapterMap = buildChapterMap(detailRoot);
console.log(`Fetched ${rawKurals.length} kurals, ${detailRoot[0].section.detail.length} books`);

// Upsert kurals in batches
const BATCH = 100;
for (let i = 0; i < rawKurals.length; i += BATCH) {
  const batch = rawKurals.slice(i, i + BATCH);
  for (const k of batch) {
    const ch = chapterMap.get(k.Number);
    if (!ch) throw new Error(`No chapter for kural #${k.Number}`);
    const scholars = JSON.stringify([
      { name: "மு.வ", commentary: k.mv },
      { name: "சாலமன் பாப்பையா", commentary: k.sp },
      { name: "கலைஞர்", commentary: k.mk },
      { name: "Couplet", commentary: k.couplet },
      { name: "Explanation", commentary: k.explanation },
    ]);
    await client.query(
      `INSERT INTO kurals (id, book, chapter, chapter_name_tamil, chapter_name_english,
        kural_tamil, transliteration, meaning_english, scholars, themes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         kural_tamil=EXCLUDED.kural_tamil,
         transliteration=EXCLUDED.transliteration,
         meaning_english=EXCLUDED.meaning_english,
         scholars=EXCLUDED.scholars`,
      [
        k.Number, ch.book, ch.chapter,
        ch.chapter_name_tamil, ch.chapter_name_english,
        `${k.Line1}\n${k.Line2}`,
        `${k.transliteration1}\n${k.transliteration2}`,
        k.Translation, scholars, [],
      ]
    );
  }
  console.log(`Seeded kurals ${i + 1}–${Math.min(i + BATCH, rawKurals.length)}`);
}

console.log("Done! 1330 kurals seeded. Daily kural is computed dynamically via getDailyKuralId().");
await client.end();
