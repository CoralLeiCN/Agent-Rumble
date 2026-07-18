# Requirements

This file is the canonical record of stakeholder-requested outcomes and
constraints for Agent Project Intelligence. Requirements are organized by topic
instead of sequence-numbered tickets. The [product specification](specification/README.md)
defines the normative behavior that satisfies them.

A requirement may mandate a technology when that choice comes from a
stakeholder, but it does not invent solution details, explain architectural
rationale, or organize delivery work. Proposed approaches belong in
[design documents](design-docs/README.md), and accepted architectural choices
belong in the [decisions record](decisions.md).

## Agent Project Card

### Goal

Create an agent that helps users understand agent-related projects.

### Project Types

The agent should support:

* Domain-specific agents
* Agent SDKs
* Repositories containing skills
* MCP projects
* Supporting repositories such as document parsers

### Project Exploration

The agent should explore the project's Git repository, documentation, and
relevant information.

### Output

The agent should produce a standardized **Project Card**, similar in purpose to
a Model Card or Dataset Card. A more appropriate name may be recommended.

The card should describe:

* What the project is for
* The project category
* The technology stack
* Other important project details

### Downstream Uses

The Project Card should support:

* An Agent Architect that recommends existing projects for an AI use case
* Comparison of projects in the same topic and their differences
* GTM analysis of a project's positive aspects, negative aspects, and gaps
* Ecosystem trend analysis across projects, including model-provider support
  and agent SDK usage

## Core Tool and Access

### Specification Breakdown

The specification should clearly distinguish the product use cases from the
core Agent Project Card tool.

### Core Agent Project Card Tool

Use Codex as the harness for project analysis. The instructions for generating
an Agent Project Card should be provided by an Agent Project Card skill attached
to Codex.

### Direct Codex Session

A user should be able to create an Agent Project Card in their own Codex session
by using the attached skill.

### API

Agent Project Intelligence should wrap Codex and the Agent Project Card skill
behind an API.

The API should be able to serve as the backend for a later frontend where a user
provides a Git repository link to create an Agent Project Card.

## Implementation Technology

### Python Tooling

Use `uv` to manage the Python part of Agent Project Intelligence.

### Agent Framework

Use the OpenAI Agents SDK to build the agent.

### Project Analysis Harness

Use Codex as the harness for analyzing projects and producing Agent Project
Cards.

### Backend Framework and Layout

Use FastAPI as the backend framework for Agent Project Intelligence and
establish a backend project layout based on FastAPI.

### Frontend Framework

Use React as the frontend framework for Agent Project Intelligence.

### Python Data Modeling and Configuration

* Use Pydantic with Python type annotations to define typed application data
  models.
* Use `BaseSettings` from Pydantic Settings for typed application settings.
* Use `load_dotenv()` from `python-dotenv` to load environment variables from
  `.env` files.

### Dependency Release Cooldown

When `uv` resolves registry dependencies, exclude distribution artifacts
uploaded within the previous seven days. Apply the cooldown to direct and
transitive dependencies to reduce exposure to newly published compromised
releases.

## Documentation Governance

### Documentation Structure

Organize project documentation into distinct areas for requirements, the
product specification, design documents, accepted decisions, and execution
plans. Review existing documents and place each one in the area appropriate to
its purpose.

Keep requirements in this single file and accepted architectural decisions in
the single [`decisions.md`](decisions.md) file. Organize both documents by topic
without sequence-numbered requirement or decision records. Maintain one change
log in each document.

### Documentation Area Responsibilities

Clearly document the responsibility of each documentation area so contributors
can determine where information belongs.

Make the distinction between requirements and accepted architectural decisions
explicit: requirements preserve what was requested, while decisions document
accepted architectural choices, their context, and their consequences.

Add repository rules that enforce these responsibilities, keep the source of
normative content explicit, and prevent duplication from creating competing
sources of truth.

### Requirements Workflow

Maintain structured documentation under `docs/` for tracking user requirements.
Update the relevant topic in this file and the corresponding product
specification in the same change. Record the update in the single change log
below instead of creating a separate ticket.

### Writing

Rephrase user requirements into a clearer, more structured form before
recording them.

The rephrased requirement should preserve what the user specified without
adding new requirements, constraints, assumptions, or details.

Use the same clear, structured writing approach in chat. The writing guideline
should contain only the points the user specifically requested and should not
add extra writing rules.

## Change Log

| Date | Topic | Change |
| --- | --- | --- |
| 2026-07-18 | Documentation governance | Consolidated the existing requirements into this topic-organized record, replaced sequence-numbered tickets with heading-based links, and established this single change log. |
