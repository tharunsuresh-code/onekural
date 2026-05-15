#!/usr/bin/env python3
"""
Fill in missing bold-term definitions in kural explanations.
Targets only kurals where **term** lacks ' — definition'.
Uses Claude Haiku 4.5 (cheap, fast, JSON) — pinned explicitly, ignores global config.
"""
import json, os, re, time, sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

import requests

MODEL = "anthropic/claude-haiku-4.5"
DATA_FILE = "/root/repos/onekural/public/data/kurals.json"
API_KEY = os.environ.get("OPENROUTER_API_KEY")
MAX_WORKERS = 5
MAX_RETRIES = 3

# ── helpers ──────────────────────────────────────────────

def find_bare_bolds(text):
    """Return list of terms whose **term** has no ' — ' immediately after."""
    bare = []
    for m in re.finditer(r'\*\*(.+?)\*\*', text):
        rest = text[m.end():]
        if not rest.startswith(" —"):
            bare.append(m.group(1))
    return bare

def count_sections(text):
    """Count blank-line-separated sections (should be 3)."""
    parts = re.split(r'\n\n+', text.strip())
    return len(parts)

def validate(text, kural_id, lang):
    """Return (ok, msg). ok=False if bare bolds remain or section count != 3."""
    bare = find_bare_bolds(text)
    if bare:
        return False, f"Still bare: {bare}"
    n = count_sections(text)
    if n != 3:
        return False, f"Section count: {n} (need 3)"
    return True, ""

# ── LLM call ──────────────────────────────────────────────

def fix_one(lang, text, kural_id, chapter_en, chapter_ta, kural_tamil):
    """Send one explanation to LLM; return fixed text or original."""
    
    prompt = f"""You are filling in missing definitions for bare bold terms in a Thirukkural explanation.

## FORMAT (must not change)
The explanation has exactly 3 sections separated by single blank lines:
  Section 1: Opening paragraph
  Section 2: Bold definitions — each line is **term** — definition  
  Section 3: Concluding paragraph
No headers. No extra blank lines. No markdown beyond **bold**.

## WHAT TO DO  
A definition is "bare" when a **term** is missing the " — " after it.
  Bare:        **அறம்**
  Complete:    **அறம்** — virtue, righteous conduct

1. Find every bare **term** that lacks " — definition"
2. Add a short, contextually accurate definition after " — " (keep the line as-is otherwise)
3. Change NOTHING else — not one word, comma, or line break
4. If every bold term already has a definition, return the text exactly as-is

## CONTEXT
Kural {kural_id}: {kural_tamil}
Chapter: {chapter_en} / {chapter_ta}

## INPUT
{text}

Return ONLY the fixed explanation. No preamble, no commentary, no code fences."""

    for attempt in range(MAX_RETRIES):
        try:
            r = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": "You are a precise text editing tool. Return exactly the input text with only bare bold terms fixed by adding ' — definition'. Never change anything else. Never add commentary."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0,
                    "max_tokens": 4000,
                },
                timeout=60,
            )

            if r.status_code == 200:
                result = r.json()
                content = result["choices"][0]["message"]["content"].strip()
                
                # Strip code fences
                if content.startswith("```"):
                    lines = content.split("\n")
                    content = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])
                    content = content.strip()
                
                ok, msg = validate(content, kural_id, lang)
                if ok:
                    return content
                else:
                    print(f"  [{kural_id} {lang}] ⚠ Validation failed: {msg} (retry {attempt+1})")
            elif r.status_code == 429:
                time.sleep(2 ** attempt)
            else:
                time.sleep(1)
        except Exception as e:
            print(f"  [{kural_id} {lang}] ⚠ {e}")
            time.sleep(1)
    
    print(f"  [{kural_id} {lang}] ❌ All retries exhausted, keeping original")
    return text

# ── main ──────────────────────────────────────────────────

def main():
    if not API_KEY:
        print("❌ OPENROUTER_API_KEY not set")
        return

    print(f"📖 Loading {DATA_FILE}...")
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        kurals = json.load(f)

    # Identify kurals needing fixes
    todo = []  # list of (index, lang, kural_id)
    for i, k in enumerate(kurals):
        k_id = k["id"]
        if find_bare_bolds(k.get("explanation_english", "")):
            todo.append((i, "EN", k_id))
        if find_bare_bolds(k.get("explanation_tamil", "")):
            todo.append((i, "TA", k_id))

    print(f"🎯 {len(todo)} fixes needed across {len(set(t[0] for t in todo))} kurals")

    if "--dry-run" in sys.argv:
        for idx, lang, k_id in todo[:20]:
            k = kurals[idx]
            bare = find_bare_bolds(k[f"explanation_{'english' if lang == 'EN' else 'tamil'}"])
            print(f"  Kural {k_id} {lang}: bare={bare}")
        return

    fixed = 0
    failed = 0
    start = time.time()

    def process(item):
        idx, lang, k_id = item
        k = kurals[idx]
        field = f"explanation_{'english' if lang == 'EN' else 'tamil'}"
        original = k[field]
        bare_before = find_bare_bolds(original)
        
        result = fix_one(
            lang, original, k_id,
            k.get("chapter_name_english", ""),
            k.get("chapter_name_tamil", ""),
            k.get("kural_tamil", "").replace("\n", " / "),
        )
        
        # Only count if something actually changed
        changed = result != original
        return idx, lang, k_id, result, changed, bare_before

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futures = {ex.submit(process, item): item for item in todo}
        
        for future in as_completed(futures):
            try:
                idx, lang, k_id, result, changed, bare_before = future.result()
            except Exception as e:
                print(f"  ❌ Future error: {e}")
                failed += 1
                continue
            
            field = f"explanation_{'english' if lang == 'EN' else 'tamil'}"
            kurals[idx][field] = result
            
            if changed:
                fixed += 1
                bare_after = find_bare_bolds(result)
                print(f"  ✅ Kural {k_id} {lang}: {len(bare_before)} bare → {len(bare_after)} bare | terms: {bare_before}")
            else:
                print(f"  ⚠ Kural {k_id} {lang}: unchanged (bare: {bare_before})")
                failed += 1

    elapsed = time.time() - start
    print(f"\n{'='*50}")
    print(f"✅ Fixed: {fixed}  ❌ Unchanged: {failed}  ⏱ {elapsed:.0f}s")

    # Save
    print(f"💾 Saving...")
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
