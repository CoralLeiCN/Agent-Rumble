# Agent Project Card Catalog

This directory is the default storage root for Agent Rumble's YAML-first card
catalog. Store each validated canonical card at:

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

Every completed card under `project-cards/` must be published here before the
catalog is considered complete. The backend regression suite checks that the
versioned catalog contains the exact complete set of preprocessed cards.
