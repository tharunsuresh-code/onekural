#!/usr/bin/env python3
"""
Fix all kural explanations using LLM (tencent/hy3-preview via OpenRouter).
Parallel execution with ThreadPoolExecutor (5 workers).
"""

import json
import os
import time
import requests
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configuration
MODEL = "anthropic/claude-haiku-4.5"  # Switched from deepseek — better JSON compliance
BATCH_SIZE = 50  # Save progress every 50 kurals
MAX_WORKERS = 5
MAX_RETRIES = 5
PROGRESS_FILE = "/root/repos/onekural/.fix_progress.json"
DATA_FILE = "/root/repos/onekural/public/data/kurals.json"
LOG_FILE = "/tmp/kural-fix.log"
API_KEY = os.environ.get('OPENROUTER_API_KEY')

def log(msg):
    timestamp = datetime.now().strftime("%H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line, flush=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r') as f:
            return json.load(f).get('last_index', 0)
    return 0

def save_progress(index):
    with open(PROGRESS_FILE, 'w') as f:
        json.dump({'last_index': index, 'timestamp': time.time()}, f)

def fix_explanation(text, lang, kural_id):
    """Send explanation to LLM for format fixing. Returns 3-section text or original on failure."""
    if not text:
        return text
    
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

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "You are a JSON formatting tool. Always respond with valid JSON only. No markdown, no code fences, no explanation."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0,
        "max_tokens": 5000,
        "response_format": {"type": "json_object"}
    }
    
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                choices = result.get("choices", [])
                if choices and len(choices) > 0:
                    content = choices[0].get("message", {}).get("content")
                    if content:
                        # Strip markdown code fences if present
                        content = content.strip()
                        if content.startswith("```"):
                            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
                            if content.endswith("```"):
                                content = content[:-3]
                            content = content.strip()
                        # Parse JSON and reconstruct 3-section text
                        data = json.loads(content)
                        # Handle case where LLM returns a JSON array instead of object
                        if isinstance(data, list):
                            data = data[0] if data else {}
                        if not isinstance(data, dict):
                            log(f"  ⚠ Unexpected JSON type for kural {kural_id} ({lang}): {type(data)}")
                            continue
                        opening = str(data.get("opening", data.get("opening_paragraph", ""))).strip()
                        quoted = str(data.get("quoted", data.get("quoted_words", ""))).strip()
                        conclusion = str(data.get("conclusion", data.get("conclusion_paragraph", ""))).strip()
                        
                        if opening and quoted and conclusion:
                            return f"{opening}\n\n{quoted}\n\n{conclusion}"
                        else:
                            log(f"  ⚠ JSON missing fields for kural {kural_id} ({lang}): {list(data.keys())}")
            elif response.status_code == 429:
                wait_time = 2 ** attempt
                log(f"  ⚠ Rate limit (429) for kural {kural_id} ({lang}), waiting {wait_time}s (attempt {attempt+1}/{MAX_RETRIES})")
                time.sleep(wait_time)
            else:
                log(f"  ⚠ API error {response.status_code} for kural {kural_id} ({lang})")
                time.sleep(2)
        except Exception as e:
            log(f"  ⚠ Exception for kural {kural_id} ({lang}): {e}")
            time.sleep(2)
    
    return text  # Return original on failure

def process_kural(kural, idx, total):
    """Process one kural (called by thread pool)."""
    kural_id = kural.get('id', idx + 1)
    fixed = False
    
    # Fix English
    eng_orig = kural.get('explanation_english', '')
    if eng_orig:
        eng_fixed = fix_explanation(eng_orig, 'English', kural_id)
        if eng_fixed != eng_orig:
            kural['explanation_english'] = eng_fixed
            fixed = True
    
    # Fix Tamil
    tam_orig = kural.get('explanation_tamil', '')
    if tam_orig:
        tam_fixed = fix_explanation(tam_orig, 'Tamil', kural_id)
        if tam_fixed != tam_orig:
            kural['explanation_tamil'] = tam_fixed
            fixed = True
    
    status = "✓ Fixed" if fixed else "○ Unchanged"
    log(f"  [{idx+1}/{total}] Kural #{kural_id}... {status}")
    
    return kural, fixed

def main():
    import sys
    limit = None
    if '--limit' in sys.argv:
        idx = sys.argv.index('--limit')
        if idx + 1 < len(sys.argv):
            limit = int(sys.argv[idx + 1])
    
    if not API_KEY:
        log("❌ OPENROUTER_API_KEY not set")
        return
    
    log(f"📖 Loading {DATA_FILE}...")
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        kurals = json.load(f)
    
    total = len(kurals) if limit is None else min(limit, len(kurals))
    start_index = load_progress()
    
    if start_index > 0:
        log(f"🔄 Resuming from index {start_index}/{total}")
    else:
        log(f"🚀 Starting fresh processing of {total} kurals")
    
    fixed_count = 0
    
    # Process in parallel batches
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = []
        
        for i in range(start_index, total):
            future = executor.submit(process_kural, kurals[i], i, total)
            futures.append((i, future))
            
            # Process in smaller chunks to save progress
            if len(futures) >= BATCH_SIZE or i == total - 1:
                for idx, future in futures:
                    try:
                        kurals[idx], was_fixed = future.result(timeout=120)
                        if was_fixed:
                            fixed_count += 1
                    except Exception as e:
                        log(f"  ⚠ Error processing kural at index {idx}: {e}")
                
                # Save progress
                log(f"  💾 Saving progress at {i+1}/{total}...")
                with open(DATA_FILE, 'w', encoding='utf-8') as f:
                    json.dump(kurals, f, ensure_ascii=False, indent=2)
                save_progress(i + 1)
                log(f"  ✅ Saved. Total fixed: {fixed_count}")
                
                futures = []
                time.sleep(1)
    
    # Final save
    log(f"\n💾 Final save...")
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(kurals, f, ensure_ascii=False, indent=2)
    save_progress(total)
    
    log(f"\n✅ Complete! Processed {total} kurals, fixed {fixed_count} explanations.")

if __name__ == "__main__":
    main()
