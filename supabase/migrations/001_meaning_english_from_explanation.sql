-- Migration: replace meaning_english with the fuller "Explanation (English)"
-- from the scholars JSONB array (index 4).
--
-- scholars array layout (set by seed.ts):
--   0: மு.வ
--   1: சாலமன் பாப்பையா
--   2: கலைஞர்
--   3: Couplet (English)
--   4: Explanation (English)  ← richer prose explanation
--
-- Run this once in your Supabase SQL Editor.

UPDATE kurals
SET meaning_english = scholars -> 4 ->> 'commentary'
WHERE scholars -> 4 ->> 'name' = 'Explanation'
  AND scholars -> 4 ->> 'commentary' IS NOT NULL
  AND scholars -> 4 ->> 'commentary' <> '';
