# MeanVC2 speech listening study

[Open the English listening test](https://jacksonyao-mao.github.io/rksa-listening-study/).

The study contains 40 trials. Each trial pairs an original recording with a resynthesis of the same sentence. Listeners rate speaker similarity, naturalness and intelligibility on five-point scales. The recordings use ten speakers from [LibriSpeech](https://www.openslr.org/12).

The first visit creates a random study ID. The browser remembers the ID, the randomized trial order and unfinished answers. A fresh browser profile or cleared site data creates another ID. The ID identifies a participation record. The study asks for no name, email address or GitHub account.

**Finish and submit** sends the completed ratings to the study collector. A receipt confirms storage. If the request is interrupted, the listener can retry or download a backup. Repeated delivery of the same response returns the existing receipt. The original listen-through and the same-sentence study have separate version identifiers.

## Repository

- `docs/` contains the GitHub Pages site, 10 blinded references and 40 blinded test recordings. Publish from `main` → `/docs`.
- `collector/` contains the write endpoint, validation and SQLite/D1 schema. The server checks the version, the 40 trial IDs and all 120 ratings. The database stores responses by study version and pseudonymous participant ID.
- The organizer can inspect the private `submissions` table in the **RKSA listening responses** Site. The production study version is `meanvc2-content-18ca2be6fa1b72f7-en`. Integration checks use a separate `/qa` study identifier. The researcher’s local export joins the opaque trial IDs with the private condition map.

Keep participant exports, organizer credentials and the condition map outside the published repository.
