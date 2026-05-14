#!/usr/bin/env python3
"""Fix Tamil explanations missing conclusion paragraphs."""
import json, time, requests, os

MODEL = "anthropic/claude-haiku-4.5"
API_KEY = os.environ.get('OPENROUTER_API_KEY')
DATA_FILE = "/root/repos/onekural/public/data/kurals.json"
MAX_RETRIES = 3

with open(DATA_FILE, "r") as f:
    kurals = json.load(f)

# Find Tamil 2p entries
to_fix = []
for k in kurals:
    tam = k.get("explanation_tamil", "")
    if not tam:
        continue
    parts = [p.strip() for p in tam.split("\n\n") if p.strip()]
    has_bold = "**" in tam
    if len(parts) <= 2 and has_bold:
        to_fix.append(k)

print(f"Fixing {len(to_fix)} Tamil explanations...")

headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
fixed = 0

for i, k in enumerate(to_fix):
    eid = k["id"]
    tam = k["explanation_tamil"]
    parts = [p.strip() for p in tam.split("\n\n") if p.strip()]
    n = len(parts)
    
    # If 1p with bold, try to split into opening + quoted
    # If 2p, add conclusion
    prompt = f"""This Tamil explanation has {n} section(s) but needs EXACTLY 3 sections:
1. Opening paragraph
2. Quoted words (**bold terms**)
3. Conclusion paragraph

The text already has sections 1 and 2 (opening + bold terms). You need to write ONLY section 3: a 1-2 sentence conclusion paragraph in Tamil that summarizes the main message. Do NOT repeat the opening. Do NOT use bold.

Existing text:
{tam}

Return ONLY the conclusion paragraph in Tamil (1-2 sentences):"""

    for attempt in range(MAX_RETRIES):
        try:
            r = requests.post("https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": "You write Tamil conclusion paragraphs. Respond with Tamil text only, no English, no formatting."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 500
                },
                timeout=30)

            if r.status_code == 200:
                conclusion = r.json()["choices"][0]["message"]["content"].strip()
                # Clean up
                conclusion = conclusion.replace("```", "").strip()
                # Reconstruct with proper format
                if n == 2:
                    k["explanation_tamil"] = f"{parts[0]}\n\n{parts[1]}\n\n{conclusion}"
                else:
                    k["explanation_tamil"] = f"{parts[0]}\n\n{conclusion}"
                fixed += 1
                if i % 10 == 0:
                    print(f"  [{i+1}/{len(to_fix)}] #{eid} ✓ + conclusion")
                break
            else:
                time.sleep(1)
        except Exception as e:
            time.sleep(1)
    else:
        print(f"  [#{eid}] ✗ failed after {MAX_RETRIES} attempts")

# Save
with open(DATA_FILE, "w") as f:
    json.dump(kurals, f, ensure_ascii=False, indent=2)

print(f"\n✅ Added conclusions to {fixed}/{len(to_fix)} Tamil explanations")

# Final validation
with open(DATA_FILE, "r") as f:
    kurals = json.load(f)

en_ok = ta_ok = en_total = ta_total = 0
nobold_ta = 0
issues = []

for k in kurals:
    for lang, key in [("en", "explanation_english"), ("ta", "explanation_tamil")]:
        text = k.get(key, "")
        if not text:
            continue
        parts = [p.strip() for p in text.split("\n\n") if p.strip()]
        n = len(parts)
        has_bold = "**" in text
        has_header = any(p.strip().split("\n")[0].lower().startswith(("opening", "conclusion", "quoted")) for p in parts[:3])
        
        if lang == "en":
            en_total += 1
            if n == 3 and not has_header and has_bold: en_ok += 1
            else: issues.append((k["id"], "EN", f"{n}p" if n != 3 else "hdr"))
        else:
            ta_total += 1
            if not has_bold:
                nobold_ta += 1
            elif n == 3 and not has_header:
                ta_ok += 1
            else:
                issues.append((k["id"], "TA", f"{n}p" if n != 3 else "hdr"))

print(f"\n{'='*50}")
print(f"FINAL RESULTS:")
print(f"  EN: {en_ok}/{en_total} ({en_ok/en_total*100:.1f}%)")
print(f"  TA: {ta_ok}/{ta_total} ({ta_ok/ta_total*100:.1f}%)")
print(f"  TA no** (unfixable): {nobold_ta}")
print(f"  Remaining issues: {len(issues)}")
if issues:
    for eid, lang, msg in issues[:10]:
        print(f"    #{eid} {lang}: {msg}")
