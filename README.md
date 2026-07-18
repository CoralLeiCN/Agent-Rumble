# Agent Rumble

Agent Rumble is an evidence-backed discovery and comparison experience for
agent-related software projects, powered by **Agent Project Intelligence**. It
helps people and agents search a prepared catalog, build a shortlist, compare
projects for a specific use case, and inspect the evidence behind important
differences.

### What We Build

We build the **Agent Project Card skill** for Codex. It analyzes agent-related
software projects and produces versioned, evidence-backed `project-card.yaml`
files.

Producing reliable cards is time- and resource-intensive because repository
evidence must be analyzed, structured, and validated. The skill makes that work
repeatable so contributors can combine their efforts to build a shared catalog
instead of repeating the same research independently.

We also use Codex to generate multiple Agent Project Cards in parallel. The
resulting cards are available in [`project-cards/`](project-cards/).

We are preparing to publish the skill as a Codex plugin. It is not published
yet because identity checks on the OpenAI platform are still pending; we plan
to resolve them shortly.

### Why We’re Building This

Coding agents are reshaping how software gets built—but as the ecosystem grows, it is becoming harder to understand what each agent does and how they differ.

Inspired by model cards and data cards, the **Agent Project Card** creates a shared standard for describing agents—making them easier to discover, compare, evaluate, and benchmark.

## Documentation

* [Developer guide](docs/development.md)
* [Documentation map](docs/README.md)
* [Product specification](docs/specification/README.md)
* [Requirements](docs/requirements.md)
* [Our build stories](docs/project-stories.md)
