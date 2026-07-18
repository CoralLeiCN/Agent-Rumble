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
documentation even though the schema models multi-source projects. The same
card-generation capability is available through the published skill packaged
as a Codex plugin and through Agent Project Card as a Service for a
user-provided public GitHub repository link.

### Included

* Public GitHub repository intake
* Operator-managed preprocessing of the selected repository cohort
* User-provided public GitHub repository intake and on-demand card generation
  through Agent Project Card as a Service
* Direct card generation with the published Agent Project Card skill packaged
  as a Codex plugin in a user's coding-agent workflow
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
* Canonical `project-card.yaml` files used directly for storage, retrieval, and
  basic search, plus generated human-readable views
* Claim and evidence records with source snapshots
* Capability support-status distinctions
* Basic keyword search over card text and structured card attributes
* Shortlisting and contextual comparison of catalog projects
* An actively playable, classic 2D versus-fighter Rumble Arena mode with
  human-looking, visibly moving, project-named fighters, health bars, a
  fullscreen option, and distinct attacks themed around the prepared
  comparison's contextual winning traits
* Manual operator-managed card refresh
* Prompt-injection resistance for repository content

### Excluded

* Private repositories
* Search-engine indexing and rich social previews for public card pages
* [Embedding-based semantic search and vector storage](../backlog.md#semantic-and-vector-search)
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
17. Make every field in the current canonical Agent Project Card contract
    available in the decision and comparison experience, with field coverage
    derived from the contract and selected card data rather than a fixed mock or
    user-interface field list.
18. Present two-project comparisons as evidence-backed Rumble Arena rounds
    without computing a universal score or forcing a universal project winner.
19. Let a user actively control an arcade match whose state changes in response
    to gameplay input, while keeping its gameplay outcome distinct from project
    claims, contextual assessment, and the canonical Agent Project Cards.
20. Present each project's public name on its fighter, show both fighters'
    health bars, and provide distinct attacks traceable to their contextual
    winning comparison traits without turning those traits into universal
    project judgments or automatic combat advantages.
21. Render human-looking fighters with visible body movement by reusing an
    existing or open-source design where available, and let the user enter
    fullscreen arcade play.
22. Allow a user to generate an Agent Project Card from a public GitHub
    repository link through Agent Project Card as a Service.
23. Allow a user to generate an Agent Project Card with the published skill
    packaged as a Codex plugin in their own coding-agent workflow.

Numeric acceptance thresholds remain an [open decision](../open-decisions.md#mvp-evaluation-protocol) until the evaluation set, rubric, reviewer process, and denominator are recorded.

---
