---
id: NUSE_DOCUMENTATION_STANDARD
version: 1.0.0
status: stable
type: specification
dependencies:
  - 00_PROJECT_PHILOSOPHY.md
---

# NUSE Documentation Standard

## Purpose

This document defines the official documentation standard used throughout the NUSE specification.

Every document contained inside `/docs/NUSE` SHALL follow these conventions unless explicitly stated otherwise.

This standard exists to ensure consistency, traceability, machine readability and long-term maintainability.

---

# 1. General Principles

Every document MUST:

- Have a single responsibility.
- Be self-contained.
- Be implementation-independent.
- Be written in English.
- Avoid ambiguity.
- Prefer precise definitions over descriptive language.
- Be understandable by both humans and AI systems.

---

# 2. File Naming

Rules:

- Use uppercase only for numeric prefixes.
- Use snake_case.
- Use descriptive names.

Examples:

00_PROJECT_PHILOSOPHY.md

01_ONTOLOGY.md

player.md

offensive_gravity.md

minutes_projection.md

Never create generic filenames such as:

data.md

variables.md

misc.md

stuff.md

---

# 3. Metadata Header

Every document SHALL begin with a metadata block.

Example

---
id: ENTITY_PLAYER
version: 1.0.0
status: stable
type: entity
dependencies:
- ENTITY_TEAM
- ENTITY_COACH
---

Mandatory fields

id

version

status

type

dependencies

---

# 4. Versioning

Semantic Versioning SHALL be used.

MAJOR.MINOR.PATCH

MAJOR

Breaking conceptual changes.

MINOR

New sections.

PATCH

Typos.

---

# 5. Allowed Status

draft

review

stable

deprecated

---

# 6. Allowed Types

specification

entity

variable

module

pipeline

algorithm

formula

validation

appendix

reference

---

# 7. Writing Rules

Always use:

MUST

SHALL

SHOULD

MAY

Avoid:

probably

maybe

usually

almost

approximately

unless uncertainty is explicitly required.

---

# 8. Single Responsibility Principle

Each document SHALL describe exactly one concept.

Examples:

player.md

Only the Player entity.

coach.md

Only the Coach entity.

Do not mix concepts.

---

# 9. Dependency Declaration

Every document SHALL explicitly declare its dependencies.

Dependencies describe conceptual requirements.

Never hide dependencies.

---

# 10. Internal References

Whenever possible, refer to document IDs instead of filenames.

Correct

ENTITY_PLAYER

Incorrect

player.md

---

# 11. AI Readability

Documents SHALL be optimized for machine interpretation.

Prefer:

structured lists

explicit definitions

clearly delimited sections

Avoid:

long narratives

unstructured paragraphs

ambiguous terminology

---

# 12. Implementation Independence

The specification defines behaviour.

Never force implementation.

Correct

"The variable SHALL represent..."

Incorrect

"Store this inside a Python dictionary..."

---

# 13. Validation

Every specification SHOULD contain a validation section whenever applicable.

Validation answers:

How do we know this module works?

---

# 14. Future Compatibility

Specifications SHALL remain valid if:

Programming language changes.

AI model changes.

API provider changes.

Database changes.

---

# 15. Documentation Hierarchy

Project Philosophy

↓

Documentation Standard

↓

Ontology

↓

Architecture

↓

Entities

↓

Variables

↓

Pipelines

↓

Algorithms

↓

Validation

↓

Appendix

No lower-level document may contradict a higher-level document.