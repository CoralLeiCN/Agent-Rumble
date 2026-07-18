# Open Decisions

These product choices remain unresolved. Recording them here prevents a design document or execution plan from silently deciding them.

## Product and Source Scope

1. How the initial catalog cohort is selected and refreshed, including what
   “leading” means without treating popularity as a universal quality score.
2. Whether the product eventually covers hosted products without public code.
3. Which project types are required beyond the representative categories already named for the MVP.
4. Which linked first-party documentation sources are included in the MVP.
5. Whether popularity and community metrics are included.
6. How much source code may be retained after analysis.
7. Which fields are mandatory for downstream recommendation.

## Schema v0.1 Reconciliation

The stakeholder-provided schema is the normative starting point, but the
following compatibility choices remain unresolved because adopting its example
literally would conflict with active requirements:

1. Whether `project.primary_type` remains limited to the five v0.1 values for
   v0.1 export while later schemas add a supporting-component value and
   namespaced extensions, or whether the v0.1 vocabulary itself should be
   revised.
2. Whether exact v0.1 export is a supported product output or v0.1 is only an
   accepted migration input once the evolved schema becomes canonical.
3. Whether v0.1 `evidence_status` should appear in evolved cards as a derived
   compatibility projection or only during v0.1 import and export.
4. Whether consumers require a compatibility representation that uses v0.1
   empty strings, despite the loss of the required distinction between
   `unknown`, `not_applicable`, `not_analyzed`, and `no_evidence_found`.
5. Which v0.1 fields are required, conditionally required, or optional in the
   executable schema.
6. How an exact v0.1 export should describe `project.primary_type` as a property
   of one repository when the Agent Project Card's subject is a project that may
   contain part of one repository or span several repositories.

## Delivery Scope

1. Whether preprocessing accepts multiple repositories per project or only
   represents that relationship in the schema.

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
