#!/usr/bin/env python3
"""
Targeted fix for remaining bare-bold and corrupted kurals (13 total).
Handles 3 categories:
  1. Full reformat (restored from original 2-section format): 793, 922, 1115 TA
  2. Inline-bold (terms in paragraph text): 362, 458, 752 TA; 906 EN
  3. Lone-line bare (term on own line): 125, 243, 342, 938 TA; 969 TA; 1016 EN
"""
import json, os, re, time, sys
import requests

MODEL = "anthropic/claude-haiku-4.5"
DATA_FILE = "/root/repos/onekural/public/data/kurals.json"
API_KEY = os.environ.get("OPENROUTER_API_KEY")

# ── Helper ───────────────────────────────────────────────

def find_bare_bolds(text):
    bare = []
    for m in re.finditer(r'\*\*(.+?)\*\*', text):
        if not text[m.end():].startswith(" —"):
            bare.append(m.group(1))
    return bare

def count_sections(text):
    return len(re.split(r'\n\n+', text.strip()))

def call_llm(system, user, max_tokens=4000):
    r = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
        json={
            "model": MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user}
            ],
            "temperature": 0,
            "max_tokens": max_tokens,
        },
        timeout=60,
    )
    if r.status_code != 200:
        raise Exception(f"API {r.status_code}: {r.text[:200]}")
    content = r.json()["choices"][0]["message"]["content"].strip()
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:-1] if lines[-1].strip().startswith("```") else lines[1:])
    return content.strip()

# ── Full reformat (for 793, 922, 1115 TA) ────────────────

def full_reformat(text, lang, kural_id):
    """Full 3-part reformat using existing Claude Haiku prompt."""
    prompt = f"""Reformat this {lang} explanation into exactly 3 parts.

Return ONLY a JSON object with these 3 keys:
- "opening": opening paragraph (plain text, no bold, no markdown)
- "quoted": **bold terms** each on its own line — PRESERVE all ** markers exactly as-is
- "conclusion": conclusion paragraph (plain text, no bold, no markdown)

RULES:
- Every key must be present. Do not omit any key.
- Preserve ALL original wording. Do not summarize or rewrite.
- Remove any section headers or labels.
- Do NOT include markdown code fences. Return raw JSON only.

Input:
{text}

JSON output:"""

    system = "You are a JSON formatting tool. Always respond with valid JSON only. No markdown, no code fences, no explanation."
    
    for attempt in range(3):
        try:
            content = call_llm(system, prompt)
            data = json.loads(content)
            if isinstance(data, list):
                data = data[0] if data else {}
            opening = str(data.get("opening", "")).strip()
            quoted = str(data.get("quoted", "")).strip()
            conclusion = str(data.get("conclusion", "")).strip()
            if opening and quoted and conclusion:
                result = f"{opening}\n\n{quoted}\n\n{conclusion}"
                bare = find_bare_bolds(result)
                if bare:
                    print(f"  [{kural_id} {lang}] ⚠ Still bare after reformat: {bare}")
                return result
        except Exception as e:
            print(f"  [{kural_id} {lang}] ⚠ Reformart attempt {attempt+1}: {e}")
            time.sleep(2)
    return text

# ── Targeted bare-term fix ───────────────────────────────

def fix_bare_terms(text, lang, kural_id, chapter_en, chapter_ta, kural_tamil):
    """Fix bare bold terms without breaking structure."""

    prompt = f"""You are fixing bare bold terms in a Thirukkural explanation.

## FORMAT (must not change)
The explanation has exactly 3 sections separated by single blank lines:
  Section 1: Opening paragraph (plain text, no bold)
  Section 2: Quoted section — ONLY **bold terms** each on its own line
  Section 3: Concluding paragraph (plain text, no bold)
No headers. No extra blank lines. No markdown beyond **bold**.

## WHAT TO FIX
A "bare" bold term is a **term** that is missing " — definition" after it.
  INVALID:  **அறம்**
  VALID:    **அறம்** — virtue, righteous conduct

## SPECIAL CASES

### Case 1: Inline-bold terms in paragraphs
If you see a pattern like `**term** என்பது definition...` in Section 1 or 3, that term should be moved to Section 2 as `**term** — short-definition`. Remove it from the paragraph and add it to the quoted section.

### Case 2: Lone bare terms
If a `**term**` sits on its own line in Section 2 with no ` — `, just add ` — definition` after it.

### Case 3: Same term appears twice
If the same **term** appears twice in Section 2, the first gets ` — definition-1`, the second gets ` — definition-2` (but use contextual Tamil meanings, not "definition-1"/"definition-2").

### Case 4: Whole-paragraph bolds
If the `**...**` wraps an entire long sentence or paragraph, split it — keep ONLY the key term bold, move the rest to plain text after ` — `.

## CONTEXT
Kural {kural_id}: {kural_tamil}
Chapter: {chapter_en} / {chapter_ta}

## INPUT
{text}

## OUTPUT
Return ONLY the fixed explanation. No preamble, no commentary, no code fences. Do not add or remove sections. Keep the 3-part structure exactly."""

    system = "You are a precise text editing tool. Return only the fixed text. Never add preamble, commentary, or code fences."

    for attempt in range(3):
        try:
            result = call_llm(system, prompt)
            bare = find_bare_bolds(result)
            secs = count_sections(result)
            if not bare and secs == 3:
                return result
            else:
                issues = []
                if bare:
                    issues.append(f"still bare: {bare}")
                if secs != 3:
                    issues.append(f"sections={secs}")
                print(f"  [{kural_id} {lang}] ⚠ {', '.join(issues)} (retry {attempt+1})")
        except Exception as e:
            print(f"  [{kural_id} {lang}] ⚠ Error: {e} (retry {attempt+1})")
        time.sleep(2)
    
    print(f"  [{kural_id} {lang}] ❌ All retries exhausted")
    return text

# ── Main ──────────────────────────────────────────────────

def main():
    if not API_KEY:
        print("❌ OPENROUTER_API_KEY not set")
        return

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        kurals = json.load(f)

    # Identify remaining problems
    targets = []
    for i, k in enumerate(kurals):
        k_id = k["id"]
        en = k.get("explanation_english", "")
        ta = k.get("explanation_tamil", "")
        
        en_bare = find_bare_bolds(en)
        ta_bare = find_bare_bolds(ta)
        
        if en_bare:
            targets.append((i, "EN", k_id, "fix_bare"))
        if ta_bare:
            # Check if sections are fine (just needs bare fix) or needs full reformat
            if count_sections(ta) <= 2:
                targets.append((i, "TA", k_id, "reformat"))
            else:
                targets.append((i, "TA", k_id, "fix_bare"))

    print(f"🎯 {len(targets)} fixes needed:")
    for idx, lang, k_id, mode in targets:
        k = kurals[idx]
        field = f"explanation_{'english' if lang == 'EN' else 'tamil'}"
        bare = find_bare_bolds(k[field])
        secs = count_sections(k[field])
        print(f"  Kural {k_id} {lang}: mode={mode}, bare={bare}, sections={secs}")

    if "--dry-run" in sys.argv:
        return

    fixed = 0
    failed = 0
    start = time.time()

    for idx, lang, k_id, mode in targets:
        k = kurals[idx]
        field = f"explanation_{'english' if lang == 'EN' else 'tamil'}"
        original = k[field]
        bare_before = find_bare_bolds(original)
        
        if mode == "reformat":
            result = full_reformat(original, "Tamil" if lang == "TA" else "English", k_id)
        else:
            result = fix_bare_terms(
                original, "Tamil" if lang == "TA" else "English", k_id,
                k.get("chapter_name_english", ""),
                k.get("chapter_name_tamil", ""),
                k.get("kural_tamil", "").replace("\n", " / "),
            )
        
        bare_after = find_bare_bolds(result)
        secs = count_sections(result)
        
        if bare_after:
            print(f"  ❌ Kural {k_id} {lang}: {len(bare_before)}→{len(bare_after)} bare, secs={secs}")
            failed += 1
        elif result != original:
            print(f"  ✅ Kural {k_id} {lang}: {bare_before}→fixed, secs={secs}")
            k[field] = result
            fixed += 1
        else:
            print(f"  ⚠ Kural {k_id} {lang}: unchanged (bare={bare_before})")
            failed += 1

    elapsed = time.time() - start
    print(f"\n{'='*50}")
    print(f"✅ Fixed: {fixed}  ❌ Failed: {failed}  ⏱ {elapsed:.0f}s")

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(kurals, f, ensure_ascii=False, indent=2)

    # Final stats
    with open(DATA_FILE, "r") as f:
        kurals2 = json.load(f)
    en_bare = sum(1 for k in kurals2 if find_bare_bolds(k.get("explanation_english", "")))
    ta_bare = sum(1 for k in kurals2 if find_bare_bolds(k.get("explanation_tamil", "")))
    print(f"📊 Remaining: EN={en_bare}, TA={ta_bare}")

if __name__ == "__main__":
    main()
