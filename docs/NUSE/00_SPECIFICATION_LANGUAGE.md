---
id: NUSE_SPECIFICATION_LANGUAGE
version: 1.0.0
status: stable
type: specification
dependencies:
  - NUSE_PROJECT_PHILOSOPHY
  - NUSE_DOCUMENTATION_STANDARD
---

# NUSE Specification Language (NSL)

## Purpose

This document defines the official language used to write every specification contained inside the NUSE documentation.

The objective of the NUSE Specification Language (NSL) is to ensure that every document is:

- Human-readable.
- AI-readable.
- Machine-consistent.
- Implementation-independent.
- Precise.
- Unambiguous.

This language defines how knowledge SHALL be represented throughout the entire NUSE specification.

---

# 1. Fundamental Principles

The NSL exists to describe basketball knowledge, not implementation.

Every specification SHALL describe:

- What something is.
- Why it exists.
- How it relates to other concepts.
- What information it requires.
- What information it generates.
- How it behaves.

The NSL SHALL NOT prescribe implementation details unless explicitly required.

---

# 2. Naming Convention

All identifiers SHALL use uppercase snake case.

Examples:

ENTITY_PLAYER

ENTITY_TEAM

VARIABLE_USAGE_RATE

VARIABLE_TRUE_SHOOTING_PERCENTAGE

MODULE_MINUTES_PROJECTION

PIPELINE_PLAYER_PROJECTION

FORMULA_EXPECTED_MINUTES

SOURCE_NBA_STATS_API

VALIDATION_PLAYER_PROJECTION

Identifiers SHALL be globally unique.

---

# 3. Categories

Every documented object SHALL belong to exactly one category.

Allowed categories are:

ENTITY

VARIABLE

MODULE

PIPELINE

FORMULA

SOURCE

VALIDATION

REFERENCE

APPENDIX

SPECIFICATION

No object may belong to multiple categories simultaneously.

---

# 4. Entity

Entities represent objects that exist inside the basketball universe.

Examples:

ENTITY_PLAYER

ENTITY_TEAM

ENTITY_GAME

ENTITY_POSSESSION

ENTITY_EVENT

Entities may contain variables.

Entities may interact with other entities.

Entities SHALL never represent calculations.

---

# 5. Variable

Variables represent measurable or estimated properties.

Examples:

VARIABLE_AGE

VARIABLE_HEIGHT

VARIABLE_USAGE_RATE

VARIABLE_OFFENSIVE_GRAVITY

Variables SHALL define:

- Definition.
- Type.
- Unit.
- Domain.
- Inputs.
- Outputs.
- Dependencies.
- Update frequency.
- Validation method.

Variables SHALL never define algorithms.

---

# 6. Module

Modules represent independent systems.

Examples:

MODULE_INJURY_MODEL

MODULE_SHOOTING_MODEL

MODULE_REBOUND_MODEL

MODULE_PASSING_MODEL

A module receives inputs and produces outputs.

Modules SHALL be replaceable without affecting unrelated modules.

---

# 7. Pipeline

Pipelines define execution order.

Examples:

PIPELINE_PLAYER_PROJECTION

PIPELINE_TEAM_PROJECTION

PIPELINE_SEASON_SIMULATION

Pipelines SHALL define sequence only.

Pipelines SHALL never define mathematical equations.

---

# 8. Formula

Formulas define mathematical behaviour.

A formula SHALL contain:

Purpose

Inputs

Outputs

Required variables

Recommended mathematical behaviour

Expected properties

Validation strategy

A formula SHALL NOT define software implementation.

---

# 9. Source

Sources describe where information may be obtained.

Examples:

SOURCE_NBA_STATS_API

SOURCE_ESPN

SOURCE_BASKETBALL_REFERENCE

SOURCE_SECOND_SPECTRUM

A source SHALL describe:

Available information

Reliability

Update frequency

Fallback strategy

No source SHALL be mandatory.

---

# 10. Validation

Every validation document SHALL answer:

What is being validated?

Why?

Against which reference?

Expected error?

Success criteria?

Known limitations?

---

# 11. Relationships

Objects SHALL explicitly declare relationships.

Allowed relationships include:

DEPENDS_ON

AFFECTS

GENERATES

USES

VALIDATES

EXTENDS

CONTAINS

OBSERVES

ESTIMATES

CALCULATES

Every relationship SHALL be directional.

Example:

VARIABLE_USAGE_RATE

AFFECTS

VARIABLE_POINTS_PER_GAME

---

# 12. Data Types

Allowed data types:

Boolean

Integer

Float

Percentage

Probability

Ordinal

Categorical

Continuous

Discrete

Distribution

Vector

Matrix

Graph

Time Series

Custom types SHALL be explicitly documented.

---

# 13. Variable Types

Every variable SHALL belong to one type.

Observable

Latent

Derived

Predicted

Contextual

Historical

Probabilistic

No variable may belong to multiple types.

---

# 14. Update Frequency

Variables SHALL define one update frequency.

Examples:

Real Time

Per Event

Per Possession

Per Quarter

Per Game

Per Week

Per Month

Per Season

Career

Static

---

# 15. Importance Levels

Every variable SHALL define importance.

CRITICAL

HIGH

MEDIUM

LOW

OPTIONAL

Importance describes influence on prediction quality.

---

# 16. Confidence Levels

Estimated variables SHALL define confidence.

VERY_HIGH

HIGH

MEDIUM

LOW

VERY_LOW

Confidence measures estimation reliability.

It does not measure importance.

---

# 17. Behaviour Description

Whenever behaviour is documented, the specification SHALL describe expected behaviour rather than implementation.

Correct:

"The variable SHALL decrease as fatigue increases."

Incorrect:

"Multiply fatigue by 0.83."

Behaviour descriptions SHALL remain implementation-independent whenever possible.

---

# 18. Dependencies

Every object SHALL explicitly declare dependencies.

Dependencies represent conceptual requirements.

Hidden dependencies are forbidden.

---

# 19. Traceability

Every output generated by NUSE SHALL be traceable.

The specification SHALL allow reconstruction of every dependency path leading to any prediction.

Traceability is mandatory.

---

# 20. Extensibility

The NSL SHALL support future additions without requiring structural modifications.

Future NBA statistics.

Future tracking systems.

Future APIs.

Future machine learning techniques.

Future simulation methods.

must all remain compatible with this language.

---

# 21. Implementation Independence

The NSL describes knowledge.

It SHALL never prescribe:

Programming languages.

Frameworks.

Libraries.

Databases.

Cloud providers.

Storage engines.

Implementations remain independent from specification.

---

# 22. Consistency Rule

Higher-level specifications override lower-level specifications.

Order of authority:

Project Philosophy

↓

Documentation Standard

↓

Specification Language

↓

Ontology

↓

Architecture

↓

Entities

↓

Variables

↓

Modules

↓

Pipelines

↓

Formulas

↓

Validation

↓

Appendices

Lower-level documents SHALL never contradict higher-level documents.

---

# 23. Final Objective

The purpose of the NSL is to create a formal knowledge representation of professional basketball.

Every future NUSE document SHALL use this language.

This ensures that any sufficiently capable AI system can interpret the specification, generate implementations, validate behaviour and improve individual modules without requiring additional human clarification.