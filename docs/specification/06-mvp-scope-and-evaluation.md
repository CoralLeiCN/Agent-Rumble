# MVP Scope and Evaluation

Part of the [Agent Rumble product specification](README.md).

## 18. Success Measures

### Card Quality

* Percentage of material claims linked to evidence
* Human reviewer accuracy rating
* Classification agreement with expert reviewers
* Unsupported-claim rate
* Contradiction rate
* Completeness of required fields
* Confidence calibration

### User Value

* Time required to understand an unfamiliar project
* Time saved during technical evaluation
* Percentage of cards judged useful
* Search-to-shortlist conversion
* Recommendation acceptance rate
* Comparison usefulness rating

### Platform Performance

* Analysis completion rate
* Average analysis cost
* Average analysis duration
* Repository coverage
* Refresh success rate
* Card staleness

### Downstream Performance

* Relevance of recommended projects
* Accuracy of project comparisons
* Quality of gap identification
* Architect acceptance of proposed components

---

## 19. MVP Scope

The MVP should focus on a searchable, comparable catalog of trustworthy Agent
Project Cards preprocessed for a selected cohort of leading public GitHub
repositories made for or used in AI systems. The preprocessing workflow may
limit each analysis to one primary repository and repository-hosted
documentation even though the schema models multi-source projects.

### Included

* Public GitHub repository intake
* Operator-managed preprocessing of the selected repository cohort
* Python and TypeScript repositories
* Static analysis only
* README and documentation analysis
* Dependency extraction
* Repository mapping
* Initial project classification
* Capability extraction
* Technology-stack extraction
* Architecture summary
* Strengths and limitations
* Maturity indicators
* Evidence references
* Canonical JSON or YAML card and generated human-readable views
* Claim and evidence records with source snapshots
* Capability support-status distinctions
* Search by stated need and structured card attributes
* Shortlisting and contextual comparison of catalog projects
* Manual operator-managed card refresh
* Prompt-injection resistance for repository content

### Excluded

* Private repositories
* User-provided repository intake and on-demand analysis
* Search-engine indexing and rich social previews for public card pages
* Automatic code execution
* Full security scanning
* Continuous repository monitoring
* Automated commercial analysis
* Advanced project recommendation
* Automated multi-project architecture generation
* Full knowledge graph
* Detailed code-level benchmarking
* Organization-wide access controls

### Repository Test Data

The project repository provides `test-data/repos/` as the designated local
corpus for downloaded GitHub repositories that will be used as inputs to Agent
Project Card creation tests.

The entire corpus directory is excluded from Git tracking so downloaded
third-party source and nested Git repositories are not committed accidentally.
When a checkout is used for testing, the test or generated card must still
record the repository URL, exact revision, and retrieval time needed to identify
its source snapshot.

Repository content in this corpus is untrusted test input. Its presence does
not authorize executing that content; MVP analysis and card-creation tests
remain static-only.

---

## 20. MVP Acceptance Criteria

The MVP is successful when it can analyze a representative set of agent-related repositories and:

1. Correctly identify the primary project type against an expert-reviewed rubric.
2. Identify major languages, frameworks, and dependencies.
3. Link material factual claims to evidence or explicitly mark them unverified.
4. Generate project summaries judged useful through expert review.
5. Identify the main capabilities and limitations through expert review.
6. Clearly mark unresolved or low-confidence information.
7. Produce cards that conform to the machine-readable schema.
8. Complete analysis without executing repository code.
9. Avoid leaking data across analysis jobs.
10. Allow a reviewer to trace major conclusions back to source files.
11. Include domain agents, SDKs or frameworks, skills, MCP projects, and supporting projects in the expert-reviewed evaluation set.
12. Record the project boundary, analyzed revisions, analysis configuration, schema version, and ontology versions.
13. Distinguish documented, statically confirmed, runtime-verified, planned, deprecated, unverified, and conflicted states where applicable.
14. Prevent instructions embedded in repository content from changing analysis policy, tool authority, project scope, or output requirements.
15. Allow users and agents to search the preprocessed catalog without first
    submitting a repository.
16. Compare selected catalog projects under an explicit assessment context while
    preserving evidence, confidence, verification, source-snapshot, and null-state
    distinctions.

Numeric acceptance thresholds remain an [open decision](../open-decisions.md#mvp-evaluation-protocol) until the evaluation set, rubric, reviewer process, and denominator are recorded.

---
