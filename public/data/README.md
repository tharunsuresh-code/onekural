# Thirukkural Dataset

1330 verses (kurals) from the Thirukkural, a classical Tamil text by Thiruvalluvar.

## File

`kurals.json` — array of 1,330 kural objects. Served publicly at `https://onekural.com/data/kurals.json`.

| Field | Description |
|--------|-------------|
| `id` | Kural number (1–1330) |
| `book` | Book number (1–3: Aram, Porul, Inbam) |
| `chapter` | Chapter number (1–133) |
| `chapter_name_tamil` | Chapter name in Tamil |
| `chapter_name_english` | Chapter name in English |
| `kural_tamil` | Original Tamil verse (two lines) |
| `transliteration` | Roman transliteration |
| `meaning_english` | Primary English translation (G.U. Pope, Victorian style) |
| `meaning_tamil` | Primary Tamil meaning (சாலமன் பாப்பையா) |
| `explanation_english` | Extended English explanation |
| `explanation_tamil` | Extended Tamil explanation |

## Contributing

To correct any kural data, edit `kurals.json` and open a pull request. Once merged to `main`, changes automatically sync to the production database via GitHub Actions.

## Acknowledgements

The Thirukkural text and translations in this dataset draw from several scholarly works:

- **Tamil verses** — original text by **Thiruvalluvar** (classical Tamil, ~2000 years old)
- **English translation** (`meaning_english`) — **G.U. Pope** (1886), one of the most respected Victorian-era renditions
- **Tamil meaning** (`meaning_tamil`) — **சாலமன் பாப்பையா (Solomon Pappaiah)**, widely used modern Tamil commentary
- **English & Tamil explanations** (`explanation_english`, `explanation_tamil`) — AI-generated using **Claude Haiku** (Anthropic), synthesising classical commentaries to make the verses accessible to a modern audience

### Base Dataset

This dataset was seeded from **[tk120404/thirukkural](https://github.com/tk120404/thirukkural)** — a comprehensive open-source digitisation of the Thirukkural that includes the original Tamil verses, transliterations, and commentaries from மு.வ, சாலமன் பாப்பையா, and கலைஞர். Thank you for making this foundational work freely available.

The source dataset is licensed under the **[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)**. The data in this repository has been transformed (columns renamed, fields merged, AI-generated explanations added) from the original structure.

## License

This dataset is released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
