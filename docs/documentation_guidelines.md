# Documentation and Writing Guidelines

This is the single operational guide for creating, organizing, updating, and
writing project documentation in this repository. It also defines when durable
information from a user or stakeholder session should be recorded.

Repository instructions and documentation indexes may point to this guide, but
they should not define competing documentation workflows or writing rules. This
guide does not replace the authority of the requirements record, product
specification, or architecture decisions record.

## Required Reading and Conflicts

Before making product, schema, architecture, or documentation-governance
changes, read:

1. This guide.
2. [`requirements.md`](requirements.md), the canonical stakeholder requirements
   record.
3. [`specification/README.md`](specification/README.md), the index for the
   normative product specification.
4. [`README.md`](README.md), the documentation index.

If these documents conflict, do not silently choose one. Preserve the intent in
the relevant requirement topic, identify the conflict, and request a product
decision when needed.

## Sources of Truth and Document Responsibilities

Place information according to its purpose and authority.

| Area | Responsibility | Not its responsibility |
| --- | --- | --- |
| [`requirements.md`](requirements.md) | Preserve stakeholder-requested outcomes and constraints in one topic-organized record with a single change log. | Choosing an unspecified solution, explaining implementation rationale, or tracking delivery work. |
| [`specification/`](specification/README.md) | Define normative product behavior that satisfies the requirements and trace it to requirement topics. | Originating stakeholder requirements or making proposed designs and plans binding. |
| [`design-docs/`](design-docs/README.md) | Explore proposed technical approaches, alternatives, risks, and trade-offs. | Overriding requirements or recording a proposal as an accepted choice. |
| [`decisions.md`](decisions.md) | Record accepted, architecturally significant implementation choices, their context, and their consequences in one topic-organized record with a single change log. | Creating stakeholder requirements, silently expanding product scope, or scheduling delivery work. |
| [`exec-plans/`](exec-plans/README.md) | Organize proposed, active, and completed delivery work. | Creating product scope, accepting architectural decisions, or changing its inputs. |
| [`backlog.md`](backlog.md) | Record requested capabilities and implementation work that stakeholders explicitly defer. | Replacing a source requirement or decision, authorizing implementation, or collecting uncommitted ideas. |
| [`open-decisions.md`](open-decisions.md) | Record unresolved product choices. | Silently selecting an answer or treating an unresolved option as committed scope. |
| [`architecture.md`](architecture.md) | Map the implemented system and link to proposed designs and accepted decisions. | Acting as a separate architecture decision record. |
| [`development.md`](development.md) | Explain local setup, repository layout, and development workflows. | Creating product requirements or architecture decisions. |
| [`project-stories.md`](project-stories.md) | Preserve selected notes about the project's building stories and how it is built. | Acting as a requirement, specification, decision, or general session transcript. |

The central distinction is:

* A **requirement** states what a stakeholder requested, including a technology
  choice when the stakeholder explicitly mandated it.
* The **specification** states what the product must do to satisfy the request.
* A **design document** explores how the product may be implemented.
* An **architecture decision** records an accepted architectural choice, its
  context, and its consequences.
* An **execution plan** states how accepted work may be delivered.
* A **backlog entry** identifies requested work that has been explicitly
  postponed.
* An **open decision** preserves a product choice that has not been resolved.
* A **project story** records selected narrative context about how the project
  is being built.

No summary, issue, plan, design document, backlog entry, open decision, project
story, or implementation detail may override an active requirement or silently
expand the product specification.

Use links instead of copying normative content between areas. A short contextual
restatement is allowed when its source remains explicit.

Do not maintain a standalone product roadmap. Put useful future-facing
information in the existing area that matches its purpose and authority.

## Capturing Information From Sessions

Do not create a general transcript or record every conversational exchange.
Capture durable information when the session establishes one of the following:

| Session outcome | Record it in |
| --- | --- |
| A new or changed stakeholder outcome or constraint | The relevant topic in [`requirements.md`](requirements.md), its change log, and the corresponding specification |
| An accepted, architecturally significant implementation choice | The relevant topic in [`decisions.md`](decisions.md) and its change log |
| A proposed implementation approach, alternative, risk, or trade-off | A document under [`design-docs/`](design-docs/README.md) |
| An unresolved product choice | [`open-decisions.md`](open-decisions.md) |
| Requested work that the stakeholder explicitly postpones | [`backlog.md`](backlog.md), linked to its source requirement or decision |
| Delivery sequence, work breakdown, or execution status | A plan under [`exec-plans/`](exec-plans/README.md) |
| A durable narrative about how the project was built | [`project-stories.md`](project-stories.md) |

Questions, brainstorming, temporary observations, status checks, and
unconfirmed suggestions remain conversation unless they produce one of these
durable outcomes. Do not promote an ambiguous statement into a requirement or
accepted decision. When the ambiguity would materially change product scope or
architecture, request a product decision.

When recording session information:

1. Capture the resulting requirement, decision, proposal, question, plan, or
   story rather than reproducing the conversation.
2. Preserve what the stakeholder specified without adding requirements,
   constraints, assumptions, or details.
3. Keep the authority and status of the recorded information explicit.
4. Link it to the source requirement, specification section, or decision when
   another documentation area depends on it.

## Requirements Workflow

When a user or stakeholder provides a new or changed requirement:

1. Rephrase the request into a clearer, more structured form without adding
   requirements, constraints, assumptions, or details.
2. Update or add the relevant topic in [`requirements.md`](requirements.md)
   without assigning a sequence number.
3. Add one entry to the requirements change log.
4. Update the relevant files indexed by
   [`specification/README.md`](specification/README.md) in the same change.
5. Add or update relevant tests when implementation exists.

The requirements record remains the source of a stakeholder-mandated technology
constraint. An architecture decision may cite that mandate as context and
document its architectural consequences and related choices, but it must not
present the mandate as independently created product scope.

If an architectural choice changes product behavior or scope, update or add the
relevant requirement and specification before accepting the decision.

## Architecture Decision Workflow

Record each accepted, architecturally significant choice under the relevant
topic in [`decisions.md`](decisions.md). Include its status, date, context,
decision, consequences, and links to related requirement headings. Add one entry
to the decisions change log whenever a decision is added or changed.

A proposed design does not become an accepted decision merely because it
appears in a design document or execution plan.

## Writing Style

Before recording a user requirement, rephrase it into a clear, structured form.
Preserve what the user specified without adding requirements, constraints,
assumptions, or details.

Use the same clear, structured approach in chat. Do not add content or writing
rules that the user did not request.

Use the repository's canonical terms consistently:

* **Agent Rumble:** the public product and user-interface name
* **Agent Project Intelligence:** the underlying system and analysis capability
* **Agent Project Card:** the canonical, versioned output artifact
* **Card Summary:** a compact human-readable or visual projection of a card
* **Project:** the logical software product, component, service, or system being
  analyzed
* **Repository:** one evidence source for all or part of a project; it is not
  automatically the project boundary
* **Source Snapshot:** the repositories, revisions, releases, documents,
  retrieval times, schema versions, ontology versions, and analysis
  configuration to which a card applies
* **Claim:** a factual statement, interpretation, or assessment connected to
  evidence
* **Evidence:** a precisely located source fragment that supports or conflicts
  with a claim
* **Assessment Context:** the use case, comparison cohort, requirements,
  organizational constraints, and time against which a judgment is made

Do not rename the formal artifact to “profile” without an explicit product
decision and corresponding requirements update. “Profile” may describe an
internal indexed projection, but it is not a separate source of truth.

## Document Maintenance

* Keep requirements and accepted architecture decisions organized by topic
  rather than sequence number.
* Maintain one change log in [`requirements.md`](requirements.md) and one in
  [`decisions.md`](decisions.md).
* Link decisions and specification changes to stable requirement headings.
* Keep Markdown heading hierarchy valid and use relative links for repository
  documents.
* Update schema, ontology, analyzer, and card versions deliberately; do not
  change their meaning in place.
* Keep area indexes navigable without duplicating the rules in this guide.

When requested work is moved out of the deferred backlog, update its source
requirement, product specification, any required architecture decision, and
applicable execution plan before implementation begins.

## Documentation Quality Check

A documentation change is complete when the applicable checks pass:

* The change traces to an existing requirement topic, or the requirement topic
  is added first.
* The requirements record and specification do not contradict each other.
* The information is stored in the area matching its purpose and authority.
* Open product decisions are recorded rather than silently assumed.
* Relevant tests, fixtures, validation, and regression coverage are updated
  when implementation exists.
* Markdown links, heading anchors, examples, and machine-readable snippets
  validate.
* The change follows this guide.
