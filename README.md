# Agent Rumble

Agent Rumble is an evidence-backed discovery and comparison experience for
agent-related software projects, powered by **Agent Project Intelligence**. It
helps people and agents search a prepared catalog, build a shortlist, compare
projects for a specific use case, and inspect the evidence behind important
differences.

The local implementation serves eleven projects with fourteen retained card
versions through FastAPI and React. Search, comparison, and Rumble share an
editable Assessment Context and canonical evidence. Public GitHub intake can
generate, save, retrieve, and refresh validated drafts; an explicit operator
command publishes reviewed cards. Public deployment and release validation
remain open.
See the [architecture overview](docs/architecture.md) and
[active delivery plan](docs/exec-plans/active/mvp-delivery.md) for remaining work.

## What We Build

We build the **Agent Project Card skill** for Codex. It analyzes agent-related
software projects and produces versioned, evidence-backed `project-card.yaml`
files.

Producing reliable cards is time- and resource-intensive because repository
evidence must be analyzed, structured, and validated. The skill makes that work
repeatable so contributors can combine their efforts to build a shared catalog
instead of repeating the same research independently.

We also use Codex to generate multiple Agent Project Cards in parallel. The
validated cards and their version history are available in
[`catalog/cards/`](catalog/cards/), the single checked-in card store.

The skill is packaged as a Codex plugin; public marketplace publication remains
pending. The [publication checklist](.agents/plugins/agent-project-card/SUBMISSION.md#public-release-checklist)
tracks publisher verification, listing details, review tests, and submission.

## Why We’re Building This

Coding agents are reshaping how software gets built—but as the ecosystem grows, it is becoming harder to understand what each agent does and how they differ.

Inspired by model cards and data cards, the **Agent Project Card** creates a shared standard for describing agents—making them easier to discover, compare, evaluate, and benchmark.

## Documentation

### Product and Governance

* [Requirements](docs/requirements.md)
* [Product specification and requirement traceability](docs/specification/README.md)
* [Architecture decisions](docs/decisions.md)
* [Open decisions](docs/open-decisions.md)
* [Deferred backlog](docs/backlog.md)
* [Documentation and writing guide](docs/documentation_guidelines.md)

### Implementation and Validation

* [Implemented architecture](docs/architecture.md)
* [Developer guide](docs/development.md)
* [QA feature inventory and test plan](docs/qa/README.md)
* [Active MVP delivery plan](docs/exec-plans/active/mvp-delivery.md)
* [Our build stories](docs/project-stories.md)

### Design Documents

* [Frontend design system and interaction guidance](docs/design-docs/frontend-design-system.md)

## Skill discovery

The canonical Agent Project Card skill is exposed to repository-local Codex
sessions at `.agents/skills/agent-project-card`, which points to
`../plugins/agent-project-card/skills/agent-project-card`. Marketplace
installations display it as `agent-project-card:agent-project-card`, using the
`<plugin-name>:<skill-name>` namespace format.
