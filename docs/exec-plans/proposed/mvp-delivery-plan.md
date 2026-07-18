# Proposed MVP Delivery Plan

**Status:** Proposed

This plan translates the [product specification](../../specification/README.md) into a possible delivery sequence. Its staffing, timing, and work breakdown are not accepted requirements or an active implementation commitment.

## 23. Delivery Assumptions

This plan assumes a lean team consisting of:

* 1 product manager
* 1 technical lead
* 2 AI or backend engineers
* 1 full-stack engineer
* Part-time design support
* Part-time agent-domain expert or technical reviewer

The plan proposes an MVP duration of approximately 12 weeks.

---

## 24. Phase 0: Product Definition

**Duration:** Week 1

### Objectives

* Finalize product terminology
* Define the first card schema
* Review the initial requirements by topic
* Select supported project categories
* Define the initial capability ontology
* Select representative evaluation repositories
* Agree on quality and evidence requirements

### Deliverables

* Topic-organized requirements record and change log
* Agent Project Card schema version 0.2
* Classification taxonomy
* Capability taxonomy
* Documented evaluation dataset
* Human-review rubric
* Topic-organized architecture decisions record, including the initial agent technology stack

### Exit Criteria

* Team agrees on the scope of an MVP card
* At least five distinct project types are represented in the test set
* Required versus optional card fields are defined
* Every accepted MVP requirement traces to the specification and an evaluation or test
* Evidence and confidence standards are documented

---

## 25. Phase 1: Repository Intake and Mapping

**Duration:** Weeks 2–3

### Objectives

* Build GitHub repository intake
* Fetch repository metadata and content
* Create repository file index
* Detect languages and dependency manifests
* Identify high-value files
* Store the project boundary and source snapshot

### Deliverables

* Repository ingestion component
* File and metadata index
* Language detector
* Dependency extractor
* Repository map
* Analysis job record
* Size and file-type safety limits

### Exit Criteria

* System can ingest the evaluation repositories
* Analysis is tied to a specific project boundary and source snapshot
* Common repository structures are mapped correctly
* Large and unsupported files are handled safely

---

## 26. Phase 2: Initial Analysis Pipeline

**Duration:** Weeks 4–5

### Objectives

* Analyze README and documentation
* Generate initial project classification
* Extract technology stack
* Identify likely capabilities
* Produce an exploration plan

### Deliverables

* Documentation analyzer
* Project classifier
* Technology extractor
* Initial capability extractor
* Exploration planner
* First draft of a card generator

### Exit Criteria

* System produces a basic card for all evaluation repositories
* Classifications include explanations and confidence
* Technology stack results are evidence-backed
* Exploration plans vary based on repository type

---

## 27. Phase 3: Specialized Repository Exploration

**Duration:** Weeks 6–7

### Objectives

* Analyze agent-specific patterns
* Inspect skills, tools, MCP components, retrieval, memory, and parsing
* Detect extension points
* Identify deployment and operational characteristics
* Improve architecture summaries

### Deliverables

* Agent framework analyzer
* Tool and skill analyzer
* MCP analyzer
* Retrieval and memory analyzer
* Document-processing analyzer
* Deployment analyzer
* Architecture synthesizer

### Exit Criteria

* System identifies project-specific capabilities beyond README claims
* Supporting repositories are classified appropriately
* Cards distinguish claimed, documented, statically confirmed, planned, deprecated, and unverified capabilities
* Architecture summaries are useful to technical reviewers

---

## 28. Phase 4: Evidence, Confidence, and Validation

**Duration:** Weeks 8–9

### Objectives

* Attach evidence to material claims
* Introduce confidence levels
* Detect unsupported statements
* Identify contradictions
* Add open questions and missing information

### Deliverables

* Evidence store
* Claim-to-evidence model
* Confidence model
* Validation agent
* Contradiction checks
* Card completeness checks
* Repository-content prompt-injection checks
* Reviewer interface for inspecting evidence

### Exit Criteria

* Material claims meet the evidence-coverage threshold defined by the accepted evaluation protocol
* Unsupported claims are removed or clearly labeled
* Low-confidence conclusions are visible
* Reviewers can navigate from card claims to repository and documentation sources
* Embedded source instructions cannot alter analysis policy, authority, or card requirements

---

## 29. Phase 5: Card Experience and Search

**Duration:** Weeks 10–11

### Objectives

* Create human-readable card views
* Create the compact summary card
* Export JSON or YAML
* Index cards
* Support basic search and filtering

### Deliverables

* Card user interface
* Card Summary view
* Evidence view
* JSON or YAML export
* Card index
* Filters for type, capability, language, maturity, and license
* Manual refresh workflow

### Exit Criteria

* Users can analyze, review, search, and export cards
* Cards are readable by both technical and product users
* Search returns relevant projects from the evaluation set
* The card schema is versioned

---

## 30. Phase 6: Evaluation and MVP Launch

**Duration:** Week 12

### Objectives

* Run the complete evaluation set
* Conduct expert review
* Fix high-severity card errors
* Document known limitations
* Prepare initial release

### Deliverables

* Evaluation report
* Quality scorecard
* Error taxonomy
* Known-limitations document
* MVP release
* Backlog for the next phase

### Exit Criteria

* MVP acceptance criteria are met or exceptions are documented
* No unresolved critical privacy or security issues
* Card quality is sufficient for controlled user testing
* Downstream teams can consume the machine-readable card

---

## 31. Workstreams

### Product and Ontology

* Define terminology
* Maintain the requirements index, tickets, and specification alignment
* Maintain classification taxonomy
* Maintain capability ontology
* Define card and claim semantics
* Prioritize use cases

### Repository Intelligence

* Repository mapping
* Static analysis
* Documentation understanding
* Dependency extraction
* Architecture reconstruction

### Agent Reasoning

* Exploration planning
* Evidence selection
* Card synthesis
* Confidence assessment
* Validation

### Platform

* Job orchestration
* Storage
* Search
* Access control
* Observability
* Cost management

### User Experience

* Intake flow
* Card and Card Summary views
* Evidence view
* Search
* Comparison readiness
* Feedback collection

### Evaluation

* Gold-standard repository set
* Expert annotation
* Error analysis
* Regression tests
* Quality monitoring

---
