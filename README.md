# MeanVC2 speech listening study

[Open the English listening test](https://jacksonyao-mao.github.io/rksa-listening-study/).

The study contains 20 trials from ten speakers, five male and five female, with two distinct source recordings per speaker. Each trial pairs an original recording with a resynthesis of the same sentence. Listeners rate speaker similarity, naturalness and intelligibility on five-point scales. The source recordings come from [LibriSpeech](https://www.openslr.org/12).

The first visit creates a random study ID. The browser remembers the ID, the randomized trial order and unfinished answers. A fresh browser profile or cleared site data creates another ID. The ID identifies a participation record. The study asks for no name, email address or GitHub account.

**Finish and submit** sends the completed ratings to the study collector. A receipt confirms storage. If the request is interrupted, the listener can retry or download a backup. Repeated delivery of the same response returns the existing receipt. The original listen-through and the same-sentence study have separate version identifiers.

## Repository

- `docs/` contains the GitHub Pages site. The active manifest uses 20 original references and 20 test recordings, with randomized order and hidden trial conditions. Earlier audio assets support existing sessions. Publish from `main` → `/docs`.
- `collector/` contains the write endpoint, validation and SQLite/D1 schema. The server checks the version, its trial IDs and all three ratings for each trial. The database stores responses by study version and pseudonymous participant ID.
- The organizer can inspect the private `submissions` table in the **RKSA listening responses** Site. The current study version is `meanvc2-reextracted-20-e81fc7ab9997-en`. The researcher’s local export joins the opaque trial IDs with the private condition map.
- Opening the page with `?preview=1` uses a separate browser session and submits to the `/qa` study identifier for integration checks.

Keep participant exports, organizer credentials and the condition map outside the published repository.
