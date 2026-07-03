---
id: MEDICAL_STAFF_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_MEDICAL_STAFF
  - INJURY_VARIABLES
  - RECOVERY_VARIABLES
  - LOAD_MANAGEMENT_VARIABLES
  - ENTITY_TEAM
---

# Medical Staff Variables

## Purpose

This document defines every medical staff-related variable recognized by the NBA Universal Simulation Engine (NUSE).

Within NUSE, the Medical Staff represents the organizational system responsible for injury prevention, diagnosis, rehabilitation, player availability and long-term health management.

Medical staff variables describe the collective medical capability of a franchise rather than the expertise of any single physician or therapist.

---

# 1. Core Principles

Medical care is preventive.

Medical decisions are probabilistic.

Medical staff influence long-term player availability.

Medical quality evolves continuously.

Medical variables SHALL represent organizational capabilities.

Medical variables SHALL remain explainable.

---

# 2. Identity Variables

MEDICAL_STAFF_ID

TEAM_ID

SEASON

DATE

TIMESTAMP

---

# 3. Department Composition

TEAM_PHYSICIAN_COUNT

ORTHOPEDIC_SPECIALIST_COUNT

SPORTS_MEDICINE_SPECIALIST_COUNT

PHYSIOTHERAPIST_COUNT

ATHLETIC_TRAINER_COUNT

REHABILITATION_SPECIALIST_COUNT

SPORTS_PSYCHOLOGIST_COUNT

---

# 4. Experience Variables

AVERAGE_MEDICAL_EXPERIENCE

NBA_MEDICAL_EXPERIENCE

SURGICAL_EXPERTISE

REHABILITATION_EXPERTISE

PREVENTION_EXPERTISE

DEPARTMENT_CONTINUITY

---

# 5. Injury Prevention

PREVENTION_PROGRAM_QUALITY

SCREENING_EFFECTIVENESS

EARLY_DETECTION

BIOMECHANICAL_MONITORING

WORKLOAD_MONITORING

RISK_IDENTIFICATION

PREVENTIVE_INTERVENTION

---

# 6. Injury Management

DIAGNOSTIC_ACCURACY

DIAGNOSIS_SPEED

TREATMENT_QUALITY

TREATMENT_CONSISTENCY

REHABILITATION_QUALITY

RETURN_TO_PLAY_PROTOCOL

MEDICAL_DECISION_QUALITY

---

# 7. Recovery Management

RECOVERY_MONITORING

LOAD_REINTRODUCTION

RECOVERY_PROTOCOL_QUALITY

RETURN_READINESS_EVALUATION

FUNCTIONAL_ASSESSMENT

RECOVERY_CUSTOMIZATION

POST_INJURY_MONITORING

---

# 8. Organizational Integration

HEAD_COACH_ALIGNMENT

PERFORMANCE_STAFF_ALIGNMENT

ANALYTICS_ALIGNMENT

PLAYER_COMMUNICATION

FRONT_OFFICE_ALIGNMENT

CROSS_DEPARTMENT_COLLABORATION

MEDICAL_INFORMATION_FLOW

---

# 9. Performance Variables

PLAYER_AVAILABILITY

INJURY_PREVENTION_SUCCESS

RECOVERY_SUCCESS_RATE

REINJURY_PREVENTION

RETURN_TO_PLAY_SUCCESS

MEDICAL_DECISION_ACCURACY

LONG_TERM_PLAYER_HEALTH

---

# 10. Composite Variables

MEDICAL_STAFF_SCORE

PREVENTION_SCORE

RECOVERY_SCORE

REHABILITATION_SCORE

PLAYER_AVAILABILITY_SCORE

MEDICAL_EFFECTIVENESS

HEALTH_MANAGEMENT_SCORE

---

# 11. Projection Variables

EXPECTED_PLAYER_AVAILABILITY

EXPECTED_INJURY_REDUCTION

EXPECTED_RECOVERY_TIME

EXPECTED_REINJURY_RATE

EXPECTED_MEDICAL_IMPROVEMENT

EXPECTED_HEALTH_OUTCOMES

EXPECTED_LONG_TERM_AVAILABILITY

---

# 12. Reliability Variables

MODEL_CONFIDENCE

MEDICAL_CONFIDENCE

OBSERVATION_CONFIDENCE

DATA_COMPLETENESS

POSTERIOR_CONFIDENCE

UNCERTAINTY

SIGNAL_TO_NOISE

---

# 13. General Rules

Medical staff variables SHALL:

Represent collective medical capability.

Support deterministic replay.

Support Bayesian updating.

Support explainable medical decisions.

Influence injury probability.

Influence recovery trajectories.

Influence player availability.

Remain organizationally interpretable.

---

# Final Statement

Medical staff variables represent the collective healthcare and sports medicine infrastructure of NBA organizations within the NBA Universal Simulation Engine.

Rather than modeling medical outcomes as isolated treatments, NUSE represents medical staffs as evolving organizational systems whose expertise, prevention strategies, rehabilitation quality and interdisciplinary collaboration influence player health, availability and career longevity while preserving explainability and causal consistency throughout the simulation engine.