---
id: ADVANCED_BIOMETRICS_VARIABLES
version: 1.0.0
status: stable
type: variables
dependencies:
  - ENTITY_PLAYER
  - PERFORMANCE_CENTER_VARIABLES
  - WORKLOAD_VARIABLES
  - FATIGUE_VARIABLES
  - PLAYER_BIORHYTHM_VARIABLES
  - PLAYER_HEALTH_VARIABLES
  - RECOVERY_VARIABLES
---

# Advanced Biometrics Variables

## Purpose

This document defines the device-level biometric and biomechanical sensor variables recognized by the NBA Universal Simulation Engine (NUSE).

These variables constitute the granular measurement layer beneath the observable-input placeholders declared in PERFORMANCE_CENTER_VARIABLES (HRV_DATA, HEART_RATE_DATA, PLAYER_JUMP_FORCE_DATA, PLAYER_LANDING_FORCE_DATA, PLAYER_SPRINT_METRICS, PLAYER_LOAD_TRACKING, GPS_MOVEMENT_DATA, BIOMECHANICAL_SENSORS) and beneath the acute:chronic ratio referenced in WORKLOAD_VARIABLES.

Two provider families are recognized: continuous recovery wearables (Oura/Whoop-class rings and straps) and athletic monitoring systems (Catapult/Kinexon-class GPS and inertial units worn during training and games).

This document does not perform medical diagnosis. Its objective is probabilistic modeling of fatigue, workload and injury risk for basketball simulation purposes.

---

# 1. Core Principles

Every biometric variable SHALL be normalized against the individual player's rolling baseline, never against a league average.

A single-session reading is noise. NUSE SHALL act only on rolling trends of seven days or more.

Every biometric variable SHALL declare its device source, since HRV and load algorithms differ by manufacturer and are not directly interchangeable.

This category is medically sensitive. It SHALL be governed under the same confidentiality standard as player health data.

No biometric variable in this document SHALL be used for individual medical decisions without certified medical staff validation; its function is probabilistic risk modeling, not diagnosis.

Biometric variables SHALL feed WORKLOAD_VARIABLES, FATIGUE_VARIABLES and PLAYER_HEALTH_VARIABLES; they SHALL NOT duplicate variables already declared there.

---

# 2. Identity Variables

BIOMETRIC_READING_ID

PLAYER_ID

TEAM_ID

SESSION_ID

SESSION_TYPE

DEVICE_SOURCE

MEASUREMENT_TIMESTAMP

MEASUREMENT_DATE

---

# 3. Acute:Chronic Workload Variables (ACWR)

DAILY_LOAD_RAW_AU

ACWR_ACUTE_WINDOW_7D

ACWR_CHRONIC_WINDOW_28D

ACWR_ROLLING_RATIO = ACWR_ACUTE_WINDOW_7D / ACWR_CHRONIC_WINDOW_28D

ACWR_EWMA

ACWR_RISK_ZONE

TRAINING_MONOTONY_INDEX = MEAN_DAILY_LOAD_7D / STANDARD_DEVIATION_DAILY_LOAD_7D

TRAINING_STRAIN_INDEX = TRAINING_MONOTONY_INDEX * WEEKLY_LOAD_SUM

LOAD_RATIO_TREND

---

# 4. Wearable HRV Variables

WEARABLE_HRV_RMSSD_MS

WEARABLE_HRV_LN_RMSSD

WEARABLE_HRV_BASELINE_ROLLING_7D

WEARABLE_HRV_BASELINE_ROLLING_30D

WEARABLE_HRV_DEVIATION_ZSCORE

WEARABLE_HRV_COEFFICIENT_OF_VARIATION

WEARABLE_HRV_MEASUREMENT_CONTEXT_FLAG

AUTONOMIC_BALANCE_PROXY_INDEX

---

# 5. Wearable Resting Heart Rate Variables

WEARABLE_RESTING_HR_BPM

WEARABLE_RESTING_HR_BASELINE_ROLLING_30D

WEARABLE_RESTING_HR_DEVIATION_BPM

WEARABLE_RESTING_HR_TREND_SLOPE_7D

WEARABLE_RESTING_HR_LOWEST_OVERNIGHT_BPM

WEARABLE_RESTING_HR_ELEVATION_FLAG

---

# 6. Neuromuscular Efficiency Variables

CMJ_HEIGHT_CM

CMJ_BASELINE_ROLLING

CMJ_DEFICIT_PCT = (CMJ_BASELINE_ROLLING - CMJ_HEIGHT_CM) / CMJ_BASELINE_ROLLING

CMJ_CONTRACTION_TIME_MS

CMJ_FLIGHT_CONTRACTION_RATIO

REACTIVE_STRENGTH_INDEX

ECCENTRIC_UTILIZATION_RATIO

FORCE_PLATE_ASYMMETRY_PCT

NEUROMUSCULAR_READINESS_SCORE

---

# 7. Jump Impact Force Variables (G-Force)

PEAK_LANDING_FORCE_G

VERTICAL_IMPACT_GFORCE_AVG

JUMP_COUNT_DAILY

HIGH_INTENSITY_JUMP_COUNT

CUMULATIVE_JUMP_LOAD_DAILY

LANDING_ASYMMETRY_GFORCE

IN_GAME_JUMP_HEIGHT_ESTIMATE_CM

---

# 8. Braking / Deceleration Asymmetry Variables

BRAKING_FORCE_LEFT_N

BRAKING_FORCE_RIGHT_N

BRAKING_ASYMMETRY_INDEX_PCT = ABS(BRAKING_FORCE_LEFT_N - BRAKING_FORCE_RIGHT_N) / MAX(BRAKING_FORCE_LEFT_N, BRAKING_FORCE_RIGHT_N)

DECELERATION_TIME_ASYMMETRY_MS

CHANGE_OF_DIRECTION_DEFICIT

POST_INJURY_COMPENSATION_FLAG

PEAK_DECELERATION_GFORCE

LIMB_SYMMETRY_INDEX_PCT

---

# 9. Wearable Sleep Variables

WEARABLE_SLEEP_TOTAL_HOURS

WEARABLE_SLEEP_EFFICIENCY_PCT

WEARABLE_SLEEP_REM_PCT

WEARABLE_SLEEP_DEEP_PCT

WEARABLE_SLEEP_ONSET_LATENCY_MIN

WEARABLE_SLEEP_DEBT_CUMULATIVE_HOURS

WEARABLE_SLEEP_CONSISTENCY_SCORE

TRAVEL_SLEEP_DISRUPTION_FLAG

SOCIAL_JETLAG_INDEX

---

# 10. Inferred Cortisol / Chronic Stress Variables

These are proxy estimates. No continuous wearable measures cortisol directly; every value in this section is an inferred composite, never a lab-verified concentration.

CORTISOL_PROXY_INDEX

INFERRED_CORTISOL_TREND_7D

CHRONIC_STRESS_FLAG

HPA_AXIS_DYSREGULATION_RISK_SCORE

SUBJECTIVE_WELLNESS_SCORE

---

# 11. Composite Readiness Variables

DAILY_READINESS_SCORE

WEARABLE_RECOVERY_SCORE

WEARABLE_STRAIN_SCORE

PHYSIOLOGICAL_RED_FLAG_COUNT

BIOMETRIC_COMPOSITE_INDEX

---

# 12. Data Governance Variables

DEVICE_PROVIDER_ID

DATA_ANONYMIZATION_FLAG

WELLNESS_DATA_CLASSIFICATION

CONSENT_STATUS

DATA_RETENTION_WINDOW

---

# 13. Reliability Variables

MODEL_CONFIDENCE

DATA_COMPLETENESS

DEVICE_SIGNAL_QUALITY

OBSERVATION_CONFIDENCE

UNCERTAINTY

POSTERIOR_VARIANCE

SIGNAL_TO_NOISE

---

# 14. General Rules

Biometric variables SHALL:

Be sourced from a named device or system, never assumed.

Be normalized against individual, not population, baselines.

Require a minimum seven-day window before triggering any risk flag.

Feed WORKLOAD_VARIABLES, FATIGUE_VARIABLES, PLAYER_HEALTH_VARIABLES and PERFORMANCE_CENTER_VARIABLES without redefining their variables.

Remain probabilistic, never diagnostic.

Be governed under the same confidentiality standard as medical data.

Support Bayesian updating as new readings arrive.

---

# Final Statement

Advanced Biometrics Variables define the concrete, device-measured substrate beneath NUSE's abstract fatigue, workload and health models.

By decomposing continuous wearable signals and on-court biomechanical sensor data into individually normalized, traceable variables, NUSE can ground its higher-level physical models in real physiological evidence while preserving a strict separation between raw measurement and inferred, probabilistic interpretation.
