# Thirukkural Dataset

1330 verses (kurals) from the Thirukkural, a classical Tamil text by Thiruvalluvar.

## File

`kurals.csv` — one row per kural.

| Column | Description |
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

To correct any kural data, edit `kurals.csv` and open a pull request. Once merged to `main`, changes automatically sync to the production database via GitHub Actions.

## License

This dataset is released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
