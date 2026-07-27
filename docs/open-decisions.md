# Open Decisions

These product choices remain unresolved.

## Product and Source Scope

1. How the initial catalog cohort is selected and refreshed, including what
   “leading” means without treating popularity as a universal quality score.
2. Whether the product eventually covers hosted products without public code.
3. Which project types are required beyond the representative categories already named for the MVP.
4. Which linked first-party documentation sources are included in the MVP.
5. Whether popularity and community metrics are included.
6. How much source code may be retained after analysis.
7. Which fields are mandatory for downstream recommendation.

## Delivery Scope

1. Whether preprocessing accepts multiple repositories per project or only
   represents that relationship in the schema.

## Agent Project Card Metadata Behavior

1. Which metadata, fields, filters, and file behavior should drive Agent Rumble
   product behavior.
2. What recurrence, semantic-stability, review, and approval criteria govern
   promotion of a namespaced project type into the controlled classification
   vocabulary.
3. Which executable schema revision adds `classification_status`, where the
   field is placed, and how `project.primary_type` is represented when the
   status is `insufficient_evidence`.

## Marketplace Publication Inputs

Public marketplace release remains blocked until the stakeholder supplies the
publisher identity, public support and policy URLs, production logo and
category, and supported countries or regions listed in the
[plugin public-release checklist](../plugins/agent-project-card/SUBMISSION.md#public-release-checklist).

## MVP Evaluation Protocol

Before numeric acceptance thresholds are adopted, decide and record:

* The representative repository evaluation set
* The evaluation rubric
* The reviewer selection and review process
* The denominator for each metric
* The acceptance threshold for each metric
