# Our Build Stories

These are our notes about how we build Agent Rumble and Agent Project
Intelligence. They are not a source of truth.

## What We Built

The central concept is the **Agent Project Card**: a standardized,
evidence-backed description of an agent-related software project. The Agent
Project Card tool uses Codex as its project-analysis harness.

We published the tool in two forms:

* An Agent Project Card skill packaged as a Codex plugin, which users can
  integrate into their own coding-agent workflow
* Agent Project Card as a Service, a web service that generates an Agent Project
  Card for a public GitHub repository link

Both forms produce the same canonical Agent Project Card.

## How We Introduce the Project

We introduce the Agent Project Card before introducing the system around it. A
short introduction for the demo series is:

> Agent Project Card is a Codex-powered tool for understanding agent-related
> software projects. Use it as a skill in your own coding-agent workflow, or
> give the hosted service a public GitHub link and let it generate the card for
> you.

The demos use the same representative public repository from one session to the
next so the audience can compare the two ways of using the tool.

## Demo Session 1: The Agent Project Card Concept

Begin with a completed Agent Project Card. Show how it describes what the
project is, what it can do, how it is built, and which source evidence supports
its material claims.

Then explain the problem it addresses: important project information is spread
across source code, documentation, configuration, examples, issues, and
releases. The card turns that fragmented information into a standardized,
versioned artifact.

The audience should leave with one idea: the Agent Project Card makes an
unfamiliar project easier to understand and reuse as structured intelligence.

## Demo Session 2: Use the Skill in Your Coding Agent

Show the published Agent Project Card skill and Codex plugin in a user's own
coding-agent workflow. Give it the representative project, invoke the skill,
and follow the work from project exploration to the validated canonical card
and its human-readable Card Summary.

Explain that the skill contains the shared card-generation instructions while
Codex provides the analysis harness.

The audience should leave with one idea: users can bring the Agent Project Card
tool into the coding-agent environment where they already work.

## Demo Session 3: Use Agent Project Card as a Service

Show the hosted path for the same representative project. Give the web service
the public GitHub repository link and follow the request through to the
generated Agent Project Card.

Place the result beside the card from the skill demo. Show that the access path
has changed but the canonical artifact and its evidence expectations have not.

The audience should leave with one idea: the service provides Agent Project
Card generation without requiring the user to integrate the skill into their
own coding-agent workflow.

## Closing the Demo Series

Close by returning to the single concept and its two forms:

* **Agent Project Card** is the concept and canonical artifact.
* **Agent Project Card skill and Codex plugin** bring the tool into the user's
  coding-agent workflow.
* **Agent Project Card as a Service** generates the card from a public GitHub
  link through a hosted web service.
* **Codex** is the core analysis harness used by the tool.

## What We Learn From Each Demo

After each session, record:

* What the audience understood without explanation
* Which terms or transitions caused confusion
* Which evidence made the story credible
* Which questions the current demo could not answer
* What should change before the next session

These observations refine how we tell the project story. They do not change the
requirements or specification unless a stakeholder explicitly requests a
product change and that change is recorded through the requirements workflow.

## Codex as the Core Harness

We use Codex heavily. Codex is the core analysis harness for the Agent Project
Card tool.

## Tools as Skills

We published the Agent Project Card skill as a Codex plugin so users can
integrate the tool into their own coding-agent workflow.

## Tools as Services

We provide Agent Project Card as a Service. The web service accepts a public
GitHub repository link and uses the Codex-powered tool to generate the card.
