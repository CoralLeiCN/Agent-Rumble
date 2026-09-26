# Agent Project Card Catalog

This directory is the single checked-in card store and the default storage root
for Agent Rumble's YAML-first catalog. Store each validated canonical card at:

```text
{encoded_card_id}/versions/{card_version}/project-card.yaml
```

`encoded_card_id` is the percent-encoded UTF-8 card ID used as one safe path
segment; the YAML retains the original card ID. The backend discovers and reads
those YAML files directly. It may build disposable in-memory state for basic
keyword search and structured filters, but the files remain the persisted
source of truth. Do not store embeddings or a vector index here.

Every `project-card.yaml` must pass the versioned Agent Project Card validator
before publication. Publishing a refresh adds a new card-version directory and
does not overwrite an earlier version.

The highest retained card version is current; earlier versions remain available
for reproducible retrieval. Tests and validation commands read these same files.
Keep generation drafts outside the checked-in catalog until review and
[explicit publication](../../backend/README.md#generation-storage-and-publication).
