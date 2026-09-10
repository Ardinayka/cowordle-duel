# English allowed-guess expansion

Source project: SCOWL (Spell Checker Oriented Word Lists), now maintained as English Speller Database (ESDB).
Primary documentation: https://github.com/en-wl/wordlist
Source snapshot: https://github.com/deepin-community/scowl/tree/139fba713005e668c25e23dc0c8ce276d7780b63
The snapshot is a distro mirror with its final word files committed on 2022-09-22. This is not a claim that the underlying lexicon was released on that date.

Retrieved using Firecrawl on 2026-09-10. CLI was unavailable; the connected Firecrawl scraper was used. The search response and source-tree response are retained under .firecrawl. Raw source content is in raw/.

Selected all english-words, american-words and british-words files at levels 10,20,35,40,50,55,60,70. Excluded separate proper-names, upper, abbreviations, contractions and special-jargon categories; excluded levels80/95. Kept only original lowercase ASCII lines matching ^[a-z]{5}$. No stripping punctuation, no lowercasing proper names, no accent conversion, no automatically generated inflections. Deduplicated and sorted.

The resulting modified subset has 6,482 allowed guesses. Union with the current 2,254 allowed guesses yields 6,508 unique guesses (4,254 additions). Current 50 curated answers should remain separate. Ordinary English plurals and inflected forms are accepted guesses. A few archaic or less familiar words remain at level70; that is acceptable for permissive guesses, but these should not be automatically selected as secret answers.

This is a MODIFIED, filtered subset of SCOWL, not an official SCOWL release. Include the full SCOWL-Copyright.txt with the deployed product, and make a credits/licence link available. Retain copyright/permission/disclaimer notices and this modification statement. Do not imply endorsement by Princeton University or the source authors. The complete source licence is permissive and allows commercial use and modification subject to its notices; no proprietary game word list was copied.

Raw downloadable template:
https://raw.githubusercontent.com/deepin-community/scowl/139fba713005e668c25e23dc0c8ce276d7780b63/final/english-words.70

License source:
https://raw.githubusercontent.com/deepin-community/scowl/master/Copyright

Raw file sha256 digests are recorded in source-checksums.json. The english-words.60 and Copyright files were fetched at master; the file tree reports all final files' last change at the pinned snapshot commit above. Other word files use the pinned URL.

Example valid guesses included: GAMER, EMAIL, EMOJI, ALOES, ADIEU, FIBRE, FIBER, TYRES, TIRES, PESTO, SUSHI, QUADS. Proper-name-only PARIS and AARON and invented QWERT are excluded by the new source subset. Previously allowed words are intentionally retained when merging.
