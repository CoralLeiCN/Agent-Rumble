# Documentation

The documentation is organized by responsibility so that stakeholder intent, the
product contract, implementation design, accepted choices, and delivery work
remain distinguishable.

## Documentation Areas

| Area | Responsibility | Not its responsibility |
| --- | --- | --- |
| [`requirements.md`](requirements.md) | Preserve requested outcomes and constraints in one topic-organized requirements record with a single change log. | Choosing a solution that the requester did not specify, explaining implementation rationale, or tracking delivery work. |
| [`specification/`](specification/README.md) | Define the normative product behavior that satisfies the recorded requirements and trace that behavior back to requirement topics. | Originating stakeholder requirements or treating proposed designs and plans as product commitments. |
| [`design-docs/`](design-docs/README.md) | Describe proposed technical approaches, alternatives, risks, and trade-offs for implementing the specification. | Overriding requirements or recording a proposal as an accepted choice. |
| [`decisions.md`](decisions.md) | Record accepted, architecturally significant implementation choices in one topic-organized decisions record with a single change log. | Creating stakeholder requirements, silently expanding product scope, or scheduling delivery work. |
| [`exec-plans/`](exec-plans/README.md) | Organize proposed, active, and completed work that delivers the accepted requirements, specification, design, and decisions. | Authorizing changes to those inputs or turning proposed work into a product requirement. |

The central distinction is:

* A **requirement** states what a stakeholder requested, including a technology
  choice when the stakeholder explicitly mandated it.
* The **specification** states what the product must do to satisfy that request.
* A **design document** explores how the product may be implemented.
* An **architecture decision** records an accepted architectural choice, its context, and its
  consequences. When a requirement already mandates a technology, the
  requirement remains the source of that constraint; the decision may reference
  it as context and focus on its architectural consequences and related choices.
* An **execution plan** states how and when the accepted work may be delivered.

## Supporting Documents

* [Deferred backlog](backlog.md) records requested capabilities and
  implementation work that stakeholders have explicitly postponed. It records
  delivery status without replacing requirements or decisions and does not
  authorize implementation.
* [Product roadmap](roadmap.md) records broader possible future directions that
  are not active requirements or explicitly deferred commitments.
* [Open decisions](open-decisions.md) records unresolved product choices without
  silently deciding them.
* [Writing guidelines](writing_guidelines.md) define how requirements and chat
  writing are structured.

No backlog entry, design document, architecture decision, execution plan,
roadmap item, or open decision may override an active requirement or silently
expand the product specification.
