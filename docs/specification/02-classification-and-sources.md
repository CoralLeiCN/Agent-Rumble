# Project Classification and Sources

Part of the [Agent Project Intelligence product specification](README.md).

## 9. Project Classification System

The classification system must be versioned, extensible, and support multiple labels because many projects span several categories. Every card records the classification-ontology version it uses. Namespaced extensions may be added without invalidating older cards.

### 9.1 Primary Project Type

* Agent application
* Domain-specific agent
* Multi-agent application
* Agent framework
* Agent SDK
* Agent runtime
* Agent orchestration platform
* Agent skill
* Tool or connector
* MCP server
* MCP client
* MCP framework
* Retrieval or knowledge system
* Memory system
* Document ingestion system
* Document parser
* Evaluation framework
* Observability platform
* Guardrail or security system
* Browser or computer-use system
* Workflow engine
* Sandbox or execution environment
* Model gateway
* Developer tooling
* Deployment infrastructure
* Example or reference application
* Benchmark or dataset
* Supporting library

### 9.2 Agent Architecture Layer

* User experience
* Agent logic
* Planning and reasoning
* Orchestration
* Model access
* Tool use
* Skills
* Protocol and interoperability
* Memory
* Retrieval and knowledge
* Data ingestion
* Document processing
* Execution and sandboxing
* Evaluation
* Observability
* Security and governance
* Deployment and operations

### 9.3 Domain

Examples include:

* General purpose
* Software engineering
* Customer support
* Sales
* Marketing
* Legal
* Finance
* Healthcare
* Research
* Education
* Data analysis
* Cybersecurity
* DevOps
* Human resources
* Supply chain
* Personal productivity
* Content generation

### 9.4 Delivery Model

* Open-source library
* Open-source application
* Hosted service
* Enterprise platform
* Command-line tool
* Desktop application
* API service
* Embedded component
* Reference implementation

---

## 10. Input Sources

The system should support the following evidence sources.

### Repository Sources

* README files
* Source code
* Directory structure
* Dependency manifests
* Build files
* Configuration files
* Environment templates
* Tests
* Examples
* Tutorials
* Architecture documents
* API specifications
* Changelogs
* Release notes
* License files
* Contribution guides
* Security policies
* Dockerfiles and deployment manifests
* GitHub Actions or other CI workflows
* Issue templates
* Pull request templates

### Repository Metadata

* Repository description
* Topics and tags
* Default branch
* Creation date
* Last update
* Contributors
* Commit history
* Releases
* Open and closed issues
* Pull requests
* Stars, forks, and watchers

Popularity metrics should be treated as contextual indicators, not measures of quality.

### External Sources

Depending on the configured analysis scope, the system may also inspect:

* Official documentation sites
* Package registries
* Technical blog posts
* Research papers
* Product documentation
* Public roadmaps
* Community discussions

Repository documentation is required for the MVP. Linked first-party documentation and package metadata may be enabled separately; broader third-party research can be added later. External claims must remain distinguishable from repository-derived evidence and must record retrieval time and available version information.

### Source Trust and Provenance

All repository and external content is untrusted input. Source text, code comments, issues, examples, and documentation must be treated as data and never as control instructions for the exploration agent.

For every source used, the system records where applicable:

* Source identifier and type
* First-party, third-party, or unknown provenance
* Repository revision, document version, or package version
* Retrieval timestamp
* Content digest
* Access scope and tenant
* Locator such as file path, line range, symbol, page, or section

The analysis runtime must isolate source content from system instructions, restrict tool authority, and prevent one project’s content from influencing another project’s card.

---
