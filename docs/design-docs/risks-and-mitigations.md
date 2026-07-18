# Technical Risks and Mitigations

This design document records implementation risks and proposed responses. It does not replace the [product specification](../specification/README.md) or constitute a security audit.

## README Bias

The system may repeat marketing claims without validating them.

**Proposed mitigation:** Require code or configuration evidence for important implementation claims.

## Repository Complexity

Large monorepos may exceed analysis budgets.

**Proposed mitigation:** Use staged mapping, targeted exploration, package-level analysis, and explicit stopping conditions.

## Taxonomy Rigidity

Agent projects evolve rapidly and may span several categories.

**Proposed mitigation:** Support multi-label classification, version the ontology, and allow uncategorized extensions.

## Skill and Schema Drift

The Codex skill, API wrapper, validators, and human-readable views may implement
different versions or interpretations of the Agent Project Card schema.

**Proposed mitigation:** Package the same versioned schema with the skill and API,
verify its digest during packaging, validate every generated card
deterministically, and generate all human-readable views from the canonical card.

## False Precision

Scores may appear more objective than the evidence supports.

**Proposed mitigation:** Prefer descriptive levels, explanations, evidence, and confidence ranges.

## Unsafe Code Execution

Repository code may be malicious.

**Proposed mitigation:** Keep the MVP static-only. Add isolated execution later only with explicit authorization.

## Repository-Content Prompt Injection

Repository files, documentation, issues, metadata, or external pages may contain instructions intended to redirect the exploration agent, expand its authority, exfiltrate information, or distort the card.

**Proposed mitigation:** Treat all source content as untrusted data, separate it from control instructions, restrict tool authority, preserve provenance, add adversarial fixtures, and validate that source instructions cannot change analysis policy or project scope.

## Project-Boundary Ambiguity

A repository may contain many projects, while one project may span several repositories, packages, documentation sites, or hosted services.

**Proposed mitigation:** Require an explicit project boundary and source roles, preserve exclusions, and attach every claim to the applicable subject scope and source snapshot.

## Stale Cards

Projects may change quickly.

**Proposed mitigation:** Record complete source snapshots, display card and evidence age, and support refresh and claim-level change detection.

## Weak Comparability

Two projects may appear similar while serving different architectural roles.

**Proposed mitigation:** Compare role, scope, interfaces, intended use, assessment context, and source snapshot before comparing features.

## Private-Repository Leakage

Sensitive repository information could be exposed if private-repository support is introduced after the MVP.

**Proposed mitigation:** Isolate tenants, enforce access control, avoid cross-project training or indexing, and maintain audit logs before that support is enabled.

## Excessive Analysis Cost

Exploration agents may inspect too much content.

**Proposed mitigation:** Introduce depth settings, token and file budgets, high-value-file ranking, caching, and early stopping.
