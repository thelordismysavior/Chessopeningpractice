# Chess-opening sources for the practice app

Research date: 2026-07-26. Chess.com was excluded.

## Recommendation

Use a small, local-first source stack:

1. Lichess `chess-openings` for opening names, ECO codes, canonical PGN/UCI lines, and positions.
2. Lichess Opening Explorer for move frequencies, results, ratings, and representative games.
3. Lichess monthly game exports for reproducible PGN data when a local database is needed.
4. Wikibooks Chess Opening Theory, or original writing, for lesson explanations. Keep third-party videos as links/embeds unless their authors grant reuse permission.

This supports a course from beginner to advanced without copying a commercial opening course.

## Sources

### 1. Lichess opening-name dataset — best metadata source

- Repository: https://github.com/lichess-org/chess-openings
- Raw data: https://github.com/lichess-org/chess-openings/tree/master
- License: CC0 / public-domain dedication for the curated facts: https://github.com/lichess-org/chess-openings/blob/master/COPYING.txt
- Fields include `eco`, `name`, and `pgn`; generated distributions also include UCI and EPD. Names are hierarchical, e.g. opening, variation, and subvariation. The repository explicitly allows multiple entries for transpositions.
- Use it to identify the requested families and branches: London/Jobava London (primarily D00-D02, depending on move order), Sicilian (B20-B99), and Caro-Kann (B10-B19). Treat the dataset's exact line/name mapping as authoritative for the app, not hand-written ECO guesses.
- Caveat: an opening label is a classification, not a complete repertoire or an endorsement of the best move. Re-check each line against current master-game statistics.

### 2. Lichess Opening Explorer — best live move-data source

- API documentation: https://lichess.org/api#tag/Opening-Explorer
- Open-source implementation and endpoint details: https://github.com/lichess-org/lila-openingexplorer
- The explorer supports masters, Lichess games, and player-filtered data. It accepts a FEN plus UCI moves and returns candidate moves, counts, results, ratings, and game references.
- Suggested app use: query positions from the CC0 opening dataset, rank replies by a chosen population (masters for advanced lessons; appropriate Lichess rating bands for beginner/intermediate lessons), then save only the resulting repertoire decisions and source URL.
- Caveat: API data is dynamic and population-dependent. Store the query date, dataset/population, and filters with generated lessons; do not present popularity as chess truth.
- Operational caveat: respect the API's current rate limits and terms; cache results instead of requesting the explorer on every practice move.

### 3. Lichess open database — PGN and reproducible bulk data

- Database page and downloads: https://database.lichess.org/
- License: chess-game database exports are released under CC0; the page permits downloading, modifying, and redistributing them.
- Monthly PGN files can provide the raw games for a local opening tree. Filter games by replaying moves and matching the opening dataset's positions; do not rely only on the PGN's optional opening tags.
- Broadcast PGNs are a separate collection under CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/
- Caveat: the database is very large. For v1, use the Opening Explorer API or a small downloaded slice rather than importing every month into the app. Preserve the source month and license notice in any derived dataset.

### 4. Wikibooks Chess Opening Theory — reusable explanatory material

- Chess project: https://en.wikibooks.org/wiki/Wikibooks:Chess
- Opening Theory book: https://en.wikibooks.org/wiki/Chess_Opening_Theory
- Copyright policy: https://en.wikibooks.org/wiki/Wikibooks:Copyrights
- Most text is CC BY-SA 4.0 and GFDL; reuse requires attribution, a license notice, and share-alike for modified redistributed text. The policy says to verify the page history/footer because individual pages or media can have different terms.
- Use it as a reference for beginner explanations, plans, and common responses in the London, Jobava London, Sicilian, and Caro-Kann. Prefer writing a fresh explanation and linking to the relevant page; if copying text, keep per-page attribution and license metadata.
- Caveat: community-edited theory can be incomplete or stale. Validate move lines with the opening dataset and current games.

### 5. Lichess practice and educational links — link/embed only by default

- Opening browser: https://lichess.org/opening
- Opening-tagged puzzles: https://lichess.org/training/openings
- Opening videos: https://lichess.org/video?tags=opening
- Developers/embedding guidance: https://lichess.org/developers
- These are useful for discovery, drills, and external references. Lichess says different services/assets can have different licenses and requires license due diligence: https://lichess.org/terms-of-service
- Caveat: a Lichess study, video, thumbnail, or user annotation is not automatically CC0. Do not copy user-created prose, annotations, or video files into the app unless the individual license/permission allows it. Linking or using an officially supported embed is the safer v1 choice.

### 6. PGN format specification — implementation reference

- PGN specification: https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm
- The specification defines `Opening`, `Variation`, `SubVariation`, and `ECO` tags, and describes ECO as a third-party opening designation. Use these fields when importing/exporting, but treat opening metadata as source-specific rather than universally canonical.

### 7. PGN Mentor — useful discovery, not a cleared bulk source

- Downloads: https://www.pgnmentor.com/files.html
- The site offers free PGN downloads and opening/player/event collections.
- Caveat: the download page does not provide a clear blanket redistribution license for the complete collection. Use it for personal research or manually selected links only until provenance and redistribution rights are confirmed. It is not recommended as the app's default ingest source.

## Suggested v1 content model

- `Opening`: family, variation, ECO, canonical PGN/UCI line, source URL, source revision/date.
- `Lesson`: original explanation, level (`beginner`, `intermediate`, `advanced`), prerequisites, and linked positions.
- `Branch`: opponent move, recommended response, alternatives, plan/theme, and evidence source.
- `Practice position`: FEN, side to move, expected move(s), acceptable alternatives, and review interval.

For the first four courses, start with one deliberately narrow repertoire per family rather than “all Sicilian” or “all London”: a core Jobava line, a core classical London line, one Sicilian branch, and one Caro-Kann branch. Expand only after practice data shows which replies are actually being encountered.

## License decisions

- Safe default for bundled structured data: Lichess `chess-openings` (CC0) and selected Lichess game exports (CC0).
- Safe default for explanations: write original lesson text; optionally link to Wikibooks or reuse it with full CC BY-SA/GFDL compliance.
- Do not bundle commercial books/courses, copied video transcripts, or unlicensed PGN collections.
- Keep a `sources`/`attribution` record with every imported or generated item. Licenses and APIs can change, so re-check before public or commercial release.
