-- =============================================================================
-- NBA UNIVERSAL SIMULATION ENGINE (NUSE) — FASE 4: ARQUITECTURA DE BASE DE DATOS
-- BLOQUE 2: ESQUEMA MICROSCÓPICO AVANZADO (5 DOMINIOS, v2.0.0)
-- =============================================================================
-- Arquitecto: Chief Quantitative Data Architect
-- Motor de base de datos objetivo: PostgreSQL 15+ (Supabase)
-- Precede a este archivo: 00_extensions_and_types.sql, 01_core_entities.sql
-- Alineado con: docs/NUSE/06_FORMULAS_CORE.md v2.0.0 §5 (LATENT & MICROSCOPIC
--               FORMULAS) y docs/NUSE/09_VARIABLES/{ADVANCED_BIOMETRICS,
--               FATIGUE,REFEREE_BIAS,PSYCHOLOGICAL,MEDIA_AND_SOCIAL_SENTIMENT,
--               FINANCIAL_INCENTIVE,VEGAS_MARKET,CALIBRATION,PLAYER_LATENT}
--               _VARIABLES.md
--
-- ─────────────────────────────────────────────────────────────────────────────
-- DECISIONES ARQUITECTÓNICAS DE ESTE BLOQUE
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CLAVES PRIMARIAS: las 5 tablas nuevas son BIGINT GENERATED ALWAYS AS
--    IDENTITY, no UUID. Esto sigue al pie de la letra la regla ya ratificada
--    en 00_extensions_and_types.sql BLOQUE 0 punto 2, que nombra literalmente
--    "biometría diaria" y "líneas de apuestas" como ejemplos de tablas de
--    hechos de alto volumen que deben usar BIGINT IDENTITY. Las 5 tablas de
--    este archivo son tablas de hechos (append-only, series temporales), no
--    entidades — el mismo razonamiento aplica a las 5 por igual.
--
-- 2. SIN updated_at / SIN trigger set_updated_at(): estas 5 tablas son logs
--    de series temporales append-only. Una recalibración bayesiana (ver
--    FORMULA_CONFIDENCE_RECALIBRATION, 06_FORMULAS_CORE.md §5.5.2) no debe
--    mutar una fila histórica — el "posterior de ayer" se persiste como
--    "prior de hoy" en una FILA NUEVA. Mutar in-place destruiría el replay
--    determinista que 00_DOCUMENTATION_STANDARD.md y las propias variables
--    exigen ("Support deterministic replay").
--
-- 3. season_id se incluye en las 5 tablas por conveniencia de consulta
--    aunque ADVANCED_BIOMETRICS_VARIABLES §2 y FINANCIAL_INCENTIVE_VARIABLES
--    §2 no lo declaren explícitamente como Identity Variable — se puede
--    derivar vía game_id → games.season_id, pero desnormalizarlo evita un
--    JOIN en el filtro más común de un producto de analítica ("dame todo lo
--    de esta temporada").
--
-- 4. game_id es NULLABLE en las 5 tablas: la mayoría de estas variables se
--    miden también en días sin partido (biometría diaria, sentimiento social,
--    proximidad a bonus). Forzar NOT NULL habría obligado a inventar un
--    game_id ficticio para lecturas de día de descanso.
--
-- 5. extra_jsonb como válvula de escape (mismo patrón que 01_core_entities.sql
--    BLOQUE 0 punto 5): cada tabla cubre la gran mayoría de las variables
--    declaradas en su(s) documento(s) fuente, pero deliberadamente deja fuera
--    el subconjunto de gobernanza de datos / metadatos de proveedor de bajo
--    valor analítico (p.ej. DATA_RETENTION_WINDOW, WELLNESS_DATA_CLASSIFICATION)
--    para no inflar el ancho de fila; ese subconjunto vive en extra_jsonb.
--
-- 6. `vegas_market_calibration` NO es una tabla ancha con una columna por
--    tipo de mercado. SPREAD, TOTAL, MONEYLINE y los ~15 tipos de player prop
--    de VEGAS_MARKET_VARIABLES §3–§9 comparten exactamente la misma forma
--    física (línea + cuota lado A/B + probabilidad implícita/no-vig lado A/B).
--    Modelarlos como columnas separadas (spread_open, total_open,
--    prop_points_line, prop_rebounds_line, ...) violaría la regla de
--    00_extensions_and_types.sql BLOQUE 0 punto 3 sobre taxonomías ABIERTAS
--    que crecerán (nuevos player props se añaden cada temporada). En su
--    lugar: formato largo/normalizado vía `vegas_market_types` (tabla de
--    lookup, no ENUM) + columnas genéricas línea/cuota reutilizables entre
--    todos los tipos de mercado. Esto es exactamente la distinción ENUM-vs-
--    lookup que ese mismo bloque ya declara para "sportsbooks" y "tipos de
--    evento granulares".
--
-- 7. LIVE / IN-GAME ODDS (VEGAS_MARKET_VARIABLES §14) se excluye
--    deliberadamente de `vegas_market_calibration`. LIVE_ODDS_UPDATE_
--    FREQUENCY_HZ implica un volumen de escritura órdenes de magnitud mayor
--    (actualizaciones por segundo durante el partido) y una vida útil de la
--    fila totalmente distinta a la de un snapshot pregame de cierre. Cuando
--    NUSE necesite modelar mercado en vivo, merece su propia tabla de alta
--    frecuencia — no debe compartir partición/índices con el snapshot
--    pregame que esta tabla sí cubre.
-- =============================================================================


-- =============================================================================
-- BLOQUE 2.0: NUEVO TIPO ENUM
-- =============================================================================
-- Fuente: 06_FORMULAS_CORE.md §5.1.1 FORMULA_ACWR, Paso 5 (clasificación de
-- zona de riesgo). Los 4 estados son un catálogo cerrado y ratificado por la
-- propia fórmula (umbrales 0.80 / 1.30 / 1.50), así que — siguiendo la regla
-- de 00_extensions_and_types.sql BLOQUE 0 punto 3 — se declara como ENUM
-- nativo y no como tabla de lookup.
DO $$ BEGIN
    CREATE TYPE acwr_risk_zone_enum AS ENUM
        ('detraining', 'sweet_spot', 'caution', 'danger');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- BLOQUE 2.1: BIOMETRICS_AND_FATIGUE_LOG
-- Fuente: docs/NUSE/09_VARIABLES/ADVANCED_BIOMETRICS_VARIABLES.md (§2-§13)
--       + docs/NUSE/09_VARIABLES/FATIGUE_VARIABLES.md (§2-§16)
--       + 06_FORMULAS_CORE.md §5.1 (FORMULA_ACWR, FORMULA_GLOBAL_FATIGUE_INDEX)
-- Grano: una fila por (player_id, measurement_timestamp[, session_id]).
-- Se excluyen deliberadamente FATIGUE_VARIABLES §9 (Game Load) y §10
-- (Schedule Load) — MINUTES_PLAYED, BACK_TO_BACK, TRAVEL_DISTANCE, etc. son
-- propiedades del partido/calendario, no mediciones biométricas, y ya viven
-- (o deben vivir) en las tablas de box score / calendario de un bloque
-- anterior — duplicarlas aquí violaría la regla propia de ambos documentos
-- fuente ("SHALL NOT duplicate variables already declared there").
-- =============================================================================
CREATE TABLE IF NOT EXISTS biometrics_and_fatigue_log (
    biometric_fatigue_log_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- ---- Identity / scoping (ADVANCED_BIOMETRICS §2, FATIGUE §2) ----
    player_id                  UUID NOT NULL REFERENCES players (player_id),
    team_id                    UUID REFERENCES teams (team_id),
    game_id                    UUID REFERENCES games (game_id),
    season_id                  UUID REFERENCES seasons (season_id),
    session_id                 TEXT,                    -- ID externo del proveedor de wearables
    session_type               simulation_session_type_enum,  -- reutiliza ENUM de 00_extensions_and_types.sql
    device_source               TEXT,                    -- 'oura','whoop','catapult','kinexon',... (taxonomía abierta)
    measurement_date           DATE NOT NULL,
    measurement_timestamp      TIMESTAMPTZ NOT NULL,

    -- ---- §3 Acute:Chronic Workload Ratio (FORMULA_ACWR §5.1.1) ----
    daily_load_raw_au                  NUMERIC(10,3),
    acwr_acute_window_7d                NUMERIC(10,3),
    acwr_chronic_window_28d             NUMERIC(10,3),
    acwr_rolling_ratio                  NUMERIC(6,3),
    acwr_ewma                          NUMERIC(6,3),
    acwr_risk_zone                     acwr_risk_zone_enum,
    training_monotony_index             NUMERIC(6,3),
    training_strain_index               NUMERIC(10,3),
    load_ratio_trend                    NUMERIC(6,3),

    -- ---- §4 Wearable HRV ----
    wearable_hrv_rmssd_ms                       NUMERIC(6,2),
    wearable_hrv_ln_rmssd                       NUMERIC(6,4),
    wearable_hrv_baseline_rolling_7d             NUMERIC(6,2),
    wearable_hrv_baseline_rolling_30d            NUMERIC(6,2),
    wearable_hrv_deviation_zscore                NUMERIC(6,3),
    wearable_hrv_coefficient_of_variation        NUMERIC(6,4),
    wearable_hrv_measurement_context_flag        TEXT,   -- 'overnight','morning_orthostatic',...
    autonomic_balance_proxy_index                NUMERIC(5,4),

    -- ---- §5 Wearable Resting Heart Rate ----
    wearable_resting_hr_bpm                     NUMERIC(5,1),
    wearable_resting_hr_baseline_rolling_30d     NUMERIC(5,1),
    wearable_resting_hr_deviation_bpm            NUMERIC(5,1),
    wearable_resting_hr_trend_slope_7d           NUMERIC(6,4),
    wearable_resting_hr_lowest_overnight_bpm      NUMERIC(5,1),
    wearable_resting_hr_elevation_flag            BOOLEAN,

    -- ---- §6 Neuromuscular Efficiency (CMJ) ----
    cmj_height_cm                       NUMERIC(5,2),
    cmj_baseline_rolling                 NUMERIC(5,2),
    cmj_deficit_pct                     NUMERIC(6,4),
    cmj_contraction_time_ms              NUMERIC(6,1),
    cmj_flight_contraction_ratio          NUMERIC(6,3),
    reactive_strength_index               NUMERIC(6,3),
    eccentric_utilization_ratio            NUMERIC(6,3),
    force_plate_asymmetry_pct             NUMERIC(6,3),
    neuromuscular_readiness_score          NUMERIC(5,4),

    -- ---- §7 Jump Impact Force (G-Force) — inputs de FORMULA_ACWR ----
    peak_landing_force_g                NUMERIC(6,3),
    vertical_impact_gforce_avg            NUMERIC(6,3),
    jump_count_daily                    INTEGER,
    high_intensity_jump_count             INTEGER,
    cumulative_jump_load_daily             NUMERIC(10,3),
    landing_asymmetry_gforce              NUMERIC(6,3),
    in_game_jump_height_estimate_cm         NUMERIC(5,2),

    -- ---- §8 Braking / Deceleration Asymmetry ----
    braking_force_left_n                 NUMERIC(7,2),
    braking_force_right_n                NUMERIC(7,2),
    braking_asymmetry_index_pct            NUMERIC(6,4),
    deceleration_time_asymmetry_ms          NUMERIC(6,2),
    change_of_direction_deficit            NUMERIC(6,4),
    post_injury_compensation_flag           BOOLEAN NOT NULL DEFAULT false,
    peak_deceleration_gforce              NUMERIC(6,3),
    limb_symmetry_index_pct               NUMERIC(5,2),

    -- ---- §9 Wearable Sleep ----
    wearable_sleep_total_hours             NUMERIC(4,2),
    wearable_sleep_efficiency_pct           NUMERIC(5,2),
    wearable_sleep_rem_pct                NUMERIC(5,2),
    wearable_sleep_deep_pct               NUMERIC(5,2),
    wearable_sleep_onset_latency_min        NUMERIC(5,1),
    wearable_sleep_debt_cumulative_hours      NUMERIC(6,2),
    wearable_sleep_consistency_score         NUMERIC(5,4),
    travel_sleep_disruption_flag            BOOLEAN NOT NULL DEFAULT false,
    social_jetlag_index                  NUMERIC(5,3),

    -- ---- §10 Inferred Cortisol / Chronic Stress (proxies, nunca medición directa) ----
    cortisol_proxy_index                 NUMERIC(5,4),
    inferred_cortisol_trend_7d             NUMERIC(6,4),
    chronic_stress_flag                  BOOLEAN NOT NULL DEFAULT false,
    hpa_axis_dysregulation_risk_score        NUMERIC(5,4),
    subjective_wellness_score              NUMERIC(5,4),

    -- ---- §11 Composite Readiness ----
    daily_readiness_score                NUMERIC(5,4),
    wearable_recovery_score               NUMERIC(5,4),
    wearable_strain_score                NUMERIC(5,4),
    physiological_red_flag_count           SMALLINT NOT NULL DEFAULT 0,
    biometric_composite_index             NUMERIC(5,4),

    -- ---- §12 Data Governance (subconjunto; el resto vive en extra_jsonb) ----
    device_provider_id                  TEXT,
    consent_status                     TEXT NOT NULL DEFAULT 'consented'
                                        CHECK (consent_status IN ('consented', 'withdrawn', 'pending')),

    -- ==== FATIGUE_VARIABLES §3 Global Fatigue ====
    total_fatigue                      NUMERIC(4,3) CHECK (total_fatigue BETWEEN 0 AND 1),
    acute_fatigue                      NUMERIC(4,3) CHECK (acute_fatigue BETWEEN 0 AND 1),
    chronic_fatigue                     NUMERIC(4,3) CHECK (chronic_fatigue BETWEEN 0 AND 1),
    baseline_fatigue                    NUMERIC(4,3) CHECK (baseline_fatigue BETWEEN 0 AND 1),
    relative_fatigue                    NUMERIC(5,3),
    accumulated_load                    NUMERIC(10,3),
    recovery_deficit                    NUMERIC(5,4),

    -- ==== FORMULA_GLOBAL_FATIGUE_INDEX §5.1.2 — sub-dominios compuestos ====
    -- (PHYSFAT/NEUROFAT/COGFAT/PSYCHFAT son intermedios matemáticos locales de
    -- la fórmula, no identificadores propios de FATIGUE_VARIABLES; se
    -- persisten aquí bajo nombres descriptivos porque son el output
    -- diagnóstico más consultado — "¿por qué subió total_fatigue?".)
    physical_fatigue_score               NUMERIC(4,3) CHECK (physical_fatigue_score BETWEEN 0 AND 1),
    neurological_fatigue_score            NUMERIC(4,3) CHECK (neurological_fatigue_score BETWEEN 0 AND 1),
    cognitive_fatigue_score               NUMERIC(4,3) CHECK (cognitive_fatigue_score BETWEEN 0 AND 1),
    psychological_fatigue_score            NUMERIC(4,3) CHECK (psychological_fatigue_score BETWEEN 0 AND 1),

    -- ---- FATIGUE §5 Neurological (subset consumido por la fórmula) ----
    reaction_time_degradation             NUMERIC(5,4),
    motor_control_loss                  NUMERIC(5,4),
    coordination_loss                   NUMERIC(5,4),

    -- ---- FATIGUE §6 Cognitive (subset consumido por la fórmula) ----
    mental_fatigue                     NUMERIC(5,4),
    attention_level                     NUMERIC(5,4),
    error_probability                    NUMERIC(5,4),
    decision_quality                    NUMERIC(5,4),

    -- ---- FATIGUE §7 Psychological — canal fisiológico (subset de la fórmula) ----
    confidence_loss                     NUMERIC(5,4),
    pressure_tolerance                   NUMERIC(5,4),
    emotional_stability                  NUMERIC(5,4),
    stress_level                       NUMERIC(5,4),

    -- ---- FATIGUE §8 Basketball Skill Impact ----
    shooting_fatigue                    NUMERIC(5,4),
    free_throw_fatigue                   NUMERIC(5,4),
    ball_handling_fatigue                 NUMERIC(5,4),
    passing_fatigue                     NUMERIC(5,4),
    playmaking_fatigue                   NUMERIC(5,4),
    finishing_fatigue                    NUMERIC(5,4),
    rebounding_fatigue                   NUMERIC(5,4),
    screening_fatigue                    NUMERIC(5,4),
    on_ball_defense_fatigue               NUMERIC(5,4),
    help_defense_fatigue                 NUMERIC(5,4),
    transition_fatigue                   NUMERIC(5,4),

    -- ---- FATIGUE §11 Recovery ----
    recovery_rate                      NUMERIC(5,4),
    recovery_efficiency                  NUMERIC(5,4),
    physiological_recovery                NUMERIC(5,4),
    mental_recovery                     NUMERIC(5,4),

    -- ---- FATIGUE §12 Injury Relationship ----
    injury_risk                       NUMERIC(5,4),
    overuse_risk                       NUMERIC(5,4),
    soft_tissue_risk                    NUMERIC(5,4),
    load_tolerance                     NUMERIC(5,4),

    -- ---- FATIGUE §14 Composite ----
    physical_readiness                   NUMERIC(5,4),
    mental_readiness                    NUMERIC(5,4),
    game_readiness                     NUMERIC(5,4),
    performance_capacity                 NUMERIC(5,4),

    -- ---- FATIGUE §15 Projection ----
    expected_fatigue                    NUMERIC(5,4),
    expected_performance_drop             NUMERIC(5,4),
    expected_injury_risk                 NUMERIC(5,4),
    expected_minutes_limit                NUMERIC(5,2),

    -- ---- Reliability (ADVANCED_BIOMETRICS §13 + FATIGUE §16, deduplicado) ----
    model_confidence                    NUMERIC(5,4),
    observation_confidence                NUMERIC(5,4),
    data_completeness                   NUMERIC(5,4),
    device_signal_quality                NUMERIC(5,4),
    uncertainty                       NUMERIC(5,4),
    posterior_variance                   NUMERIC(9,6),
    signal_to_noise                     NUMERIC(8,4),

    extra_jsonb                       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN biometrics_and_fatigue_log.physical_fatigue_score IS
    'PHYSFAT en FORMULA_GLOBAL_FATIGUE_INDEX (06_FORMULAS_CORE.md §5.1.2). Intermedio local persistido para diagnóstico.';
COMMENT ON COLUMN biometrics_and_fatigue_log.psychological_fatigue_score IS
    'PSYCHFAT: suma acotada del canal fisiológico + PSYCHOLOGICAL_STRESS_INDEX (canal narrativo, ver psychological_narrative_log), por regla de composición cross-domain §5.1.2 Paso 4.';
COMMENT ON COLUMN biometrics_and_fatigue_log.game_id IS
    'NULL en lecturas de día sin partido (wellness matutino, ACWR de entrenamiento). No forzar un partido ficticio.';

CREATE INDEX IF NOT EXISTS idx_biofatigue_player_ts
    ON biometrics_and_fatigue_log (player_id, measurement_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_biofatigue_game
    ON biometrics_and_fatigue_log (game_id) WHERE game_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_biofatigue_team_date
    ON biometrics_and_fatigue_log (team_id, measurement_date);
CREATE INDEX IF NOT EXISTS idx_biofatigue_season
    ON biometrics_and_fatigue_log (season_id);
CREATE INDEX IF NOT EXISTS idx_biofatigue_risk_zone
    ON biometrics_and_fatigue_log (acwr_risk_zone) WHERE acwr_risk_zone IN ('caution', 'danger');
-- BRIN: la tabla crece insertando estrictamente en orden temporal (ingesta diaria
-- por jugador); BRIN es órdenes de magnitud más pequeño que B-tree para este
-- patrón de acceso a escala de millones de filas multi-temporada.
CREATE INDEX IF NOT EXISTS idx_biofatigue_ts_brin
    ON biometrics_and_fatigue_log USING BRIN (measurement_timestamp);


-- =============================================================================
-- BLOQUE 2.2: REFEREE_BIAS_LOG
-- Fuente: docs/NUSE/09_VARIABLES/REFEREE_BIAS_VARIABLES.md (§2-§9)
--       + 06_FORMULAS_CORE.md §5.2 (FORMULA_COMPOSITE_BIAS_INDEX)
-- Grano: una fila por (game_id, referee_id, player_id) — díada árbitro-jugador
-- por partido, con coach_id desnormalizado (entrenador del jugador en ese
-- partido) porque STAR_WHISTLE_MARGIN es inherentemente por-jugador y
-- REFEREE_COACH_FRICTION_INDEX inherentemente por-entrenador; ambos términos
-- deben coexistir en la misma fila para poder materializar
-- TOTAL_BIAS_ADJUSTMENT_INDEX como columna única.
-- =============================================================================
CREATE TABLE IF NOT EXISTS referee_bias_log (
    referee_bias_log_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- ---- Identity / scoping (§2) ----
    referee_id                 UUID NOT NULL REFERENCES referees (referee_id),
    player_id                  UUID NOT NULL REFERENCES players (player_id),
    coach_id                   UUID REFERENCES coaches (coach_id),
    game_id                    UUID NOT NULL REFERENCES games (game_id),
    team_id                    UUID REFERENCES teams (team_id),
    season_id                  UUID REFERENCES seasons (season_id),
    sample_size                INTEGER NOT NULL DEFAULT 0,   -- puerta de fiabilidad, κ=30 partidos en la fórmula

    -- ---- §3 Score-State Contact Tolerance ----
    contact_tolerance_close_game_modifier    NUMERIC(6,4),
    contact_tolerance_blowout_modifier       NUMERIC(6,4),
    garbage_time_whistle_leniency          NUMERIC(6,4),
    crunch_time_whistle_tightness           NUMERIC(6,4),
    score_margin_foul_rate_elasticity        NUMERIC(6,4),
    lead_protection_foul_suppression        NUMERIC(6,4),
    comeback_context_foul_inflation         NUMERIC(6,4),

    -- ---- §4 Home Crowd Susceptibility ----
    referee_home_crowd_susceptibility_index   NUMERIC(6,4),
    noise_elasticity_of_calls              NUMERIC(6,4),
    decibel_response_coefficient            NUMERIC(8,5),
    road_crowd_hostility_response           NUMERIC(6,4),
    arena_specific_susceptibility_delta       NUMERIC(6,4),
    crowd_induced_call_reversal_rate         NUMERIC(5,4),

    -- ---- §5 Star Call Bias ----
    star_whistle_margin                 NUMERIC(6,4),
    franchise_player_foul_draw_bias         NUMERIC(6,4),
    superstar_non_call_rate               NUMERIC(5,4),
    all_star_status_call_differential        NUMERIC(6,4),
    usage_rate_foul_bias_correlation         NUMERIC(6,4),
    marketing_value_call_correlation         NUMERIC(6,4),
    benefit_of_doubt_index               NUMERIC(5,4),
    rookie_unknown_player_penalty           NUMERIC(6,4),

    -- ---- §6 Coach Friction ----
    referee_coach_friction_index           NUMERIC(6,4),
    historical_technical_foul_rate_by_pair    NUMERIC(6,4),
    ejection_history_with_coach            SMALLINT NOT NULL DEFAULT 0,
    coach_complaint_response_sensitivity      NUMERIC(6,4),
    coach_reputation_carryover_bias          NUMERIC(6,4),
    sideline_proximity_escalation_rate        NUMERIC(6,4),

    -- ---- §7 Reputation & Media Carryover ----
    player_reputation_call_carryover         NUMERIC(6,4),
    flopping_reputation_penalty            NUMERIC(6,4),
    physicality_reputation_tolerance         NUMERIC(6,4),
    national_tv_scrutiny_adjustment          NUMERIC(6,4),
    prior_controversy_overcorrection         NUMERIC(6,4),

    -- ---- §8 Composite Bias (FORMULA_COMPOSITE_BIAS_INDEX §5.2.1 output) ----
    total_bias_adjustment_index            NUMERIC(6,4) CHECK (total_bias_adjustment_index BETWEEN -1 AND 1),
    dyadic_bias_confidence               NUMERIC(5,4),
    bias_direction                     TEXT CHECK (bias_direction IN ('favorable', 'unfavorable', 'neutral')),
    bias_magnitude                     NUMERIC(6,4),
    bias_stability_over_time              NUMERIC(5,4),

    -- ---- §9 Reliability ----
    model_confidence                   NUMERIC(5,4),
    sample_size_confidence               NUMERIC(5,4),
    data_completeness                   NUMERIC(5,4),
    observation_confidence               NUMERIC(5,4),
    uncertainty                      NUMERIC(5,4),
    posterior_variance                  NUMERIC(9,6),
    signal_to_noise                    NUMERIC(8,4),

    extra_jsonb                      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE referee_bias_log IS
    'Toda variable en esta tabla representa tendencia estadística observada, nunca una acusación de mala conducta intencional (REFEREE_BIAS_VARIABLES §1).';
COMMENT ON COLUMN referee_bias_log.total_bias_adjustment_index IS
    'Output de FORMULA_COMPOSITE_BIAS_INDEX (06_FORMULAS_CORE.md §5.2.1). Escribe exclusivamente en la capa latente de ENTITY_REFEREE — NUNCA debe usarse para ajustar una variable latente de ENTITY_PLAYER.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_referee_bias_dyad_per_game
    ON referee_bias_log (game_id, referee_id, player_id);
CREATE INDEX IF NOT EXISTS idx_referee_bias_referee
    ON referee_bias_log (referee_id, game_id);
CREATE INDEX IF NOT EXISTS idx_referee_bias_player
    ON referee_bias_log (player_id);
CREATE INDEX IF NOT EXISTS idx_referee_bias_coach
    ON referee_bias_log (coach_id) WHERE coach_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referee_bias_season
    ON referee_bias_log (season_id);


-- =============================================================================
-- BLOQUE 2.3: PSYCHOLOGICAL_NARRATIVE_LOG
-- Fuente: docs/NUSE/09_VARIABLES/PSYCHOLOGICAL_VARIABLES.md (§2-§14)
--       + docs/NUSE/09_VARIABLES/MEDIA_AND_SOCIAL_SENTIMENT_VARIABLES.md (§2-§8)
--       + 06_FORMULAS_CORE.md §5.3 (FORMULA_COMPOSITE_NARRATIVE_VARIABLE,
--         FORMULA_PSYCHOLOGICAL_STRESS_INDEX)
-- Grano: una fila por (player_id, measurement_timestamp). source_platform y
-- sample_volume quedan NULL en filas puramente psicológicas (sin insumo de
-- medios); game_id queda NULL en señales de narrativa medidas en días sin
-- partido (rumores de trade, sentimiento social continuo).
-- =============================================================================
CREATE TABLE IF NOT EXISTS psychological_narrative_log (
    psych_narrative_log_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- ---- Identity / scoping (PSYCHOLOGICAL §2, MEDIA_AND_SOCIAL_SENTIMENT §2) ----
    player_id                  UUID NOT NULL REFERENCES players (player_id),
    team_id                    UUID REFERENCES teams (team_id),
    game_id                    UUID REFERENCES games (game_id),
    season_id                  UUID REFERENCES seasons (season_id),
    source_platform             TEXT,          -- 'twitter','reddit','sports_media',... (taxonomía abierta; NULL si no aplica)
    sample_volume               INTEGER,        -- SAMPLE_VOLUME: menciones/muestras que respaldan la lectura de sentimiento
    measurement_timestamp        TIMESTAMPTZ NOT NULL,

    -- ==== PSYCHOLOGICAL_VARIABLES §3 Confidence ====
    self_confidence             NUMERIC(4,3) CHECK (self_confidence BETWEEN 0 AND 1),
    shooting_confidence           NUMERIC(4,3) CHECK (shooting_confidence BETWEEN 0 AND 1),
    playmaking_confidence          NUMERIC(4,3) CHECK (playmaking_confidence BETWEEN 0 AND 1),
    defensive_confidence           NUMERIC(4,3) CHECK (defensive_confidence BETWEEN 0 AND 1),
    free_throw_confidence          NUMERIC(4,3) CHECK (free_throw_confidence BETWEEN 0 AND 1),
    clutch_confidence             NUMERIC(4,3) CHECK (clutch_confidence BETWEEN 0 AND 1),
    overall_confidence            NUMERIC(4,3) CHECK (overall_confidence BETWEEN 0 AND 1),

    -- ---- §4 Emotional ----
    emotional_state              NUMERIC(4,3) CHECK (emotional_state BETWEEN 0 AND 1),
    emotional_stability            NUMERIC(4,3) CHECK (emotional_stability BETWEEN 0 AND 1),
    frustration_level             NUMERIC(4,3) CHECK (frustration_level BETWEEN 0 AND 1),
    motivation_level              NUMERIC(4,3) CHECK (motivation_level BETWEEN 0 AND 1),
    enthusiasm_level              NUMERIC(4,3) CHECK (enthusiasm_level BETWEEN 0 AND 1),
    competitive_drive             NUMERIC(4,3) CHECK (competitive_drive BETWEEN 0 AND 1),
    self_control                 NUMERIC(4,3) CHECK (self_control BETWEEN 0 AND 1),

    -- ---- §5 Cognitive ----
    focus                     NUMERIC(4,3) CHECK (focus BETWEEN 0 AND 1),
    attention                   NUMERIC(4,3) CHECK (attention BETWEEN 0 AND 1),
    mental_clarity                NUMERIC(4,3) CHECK (mental_clarity BETWEEN 0 AND 1),
    decision_confidence            NUMERIC(4,3) CHECK (decision_confidence BETWEEN 0 AND 1),
    decision_hesitation            NUMERIC(4,3) CHECK (decision_hesitation BETWEEN 0 AND 1),
    game_awareness                NUMERIC(4,3) CHECK (game_awareness BETWEEN 0 AND 1),
    situational_awareness           NUMERIC(4,3) CHECK (situational_awareness BETWEEN 0 AND 1),

    -- ---- §6 Pressure (inputs directos de FORMULA_PSYCHOLOGICAL_STRESS_INDEX) ----
    pressure_tolerance             NUMERIC(4,3) CHECK (pressure_tolerance BETWEEN 0 AND 1),
    stress_level                 NUMERIC(4,3) CHECK (stress_level BETWEEN 0 AND 1),
    anxiety_level                NUMERIC(4,3) CHECK (anxiety_level BETWEEN 0 AND 1),
    clutch_resilience              NUMERIC(4,3) CHECK (clutch_resilience BETWEEN 0 AND 1),
    expectation_pressure            NUMERIC(4,3) CHECK (expectation_pressure BETWEEN 0 AND 1),
    public_pressure               NUMERIC(4,3) CHECK (public_pressure BETWEEN 0 AND 1),
    media_pressure                NUMERIC(4,3) CHECK (media_pressure BETWEEN 0 AND 1),

    -- ---- §7 Competitive ----
    competitiveness               NUMERIC(4,3) CHECK (competitiveness BETWEEN 0 AND 1),
    aggressiveness                NUMERIC(4,3) CHECK (aggressiveness BETWEEN 0 AND 1),
    discipline                  NUMERIC(4,3) CHECK (discipline BETWEEN 0 AND 1),
    patience                    NUMERIC(4,3) CHECK (patience BETWEEN 0 AND 1),
    risk_tolerance                NUMERIC(4,3) CHECK (risk_tolerance BETWEEN 0 AND 1),

    -- ---- §8 Social ----
    team_trust                  NUMERIC(4,3) CHECK (team_trust BETWEEN 0 AND 1),
    coach_trust                  NUMERIC(4,3) CHECK (coach_trust BETWEEN 0 AND 1),
    role_acceptance                NUMERIC(4,3) CHECK (role_acceptance BETWEEN 0 AND 1),
    leadership_influence            NUMERIC(4,3) CHECK (leadership_influence BETWEEN 0 AND 1),
    locker_room_comfort            NUMERIC(4,3) CHECK (locker_room_comfort BETWEEN 0 AND 1),

    -- ---- §9 Adaptation ----
    learning_rate                 NUMERIC(4,3) CHECK (learning_rate BETWEEN 0 AND 1),
    mental_adaptability             NUMERIC(4,3) CHECK (mental_adaptability BETWEEN 0 AND 1),
    mistake_recovery               NUMERIC(4,3) CHECK (mistake_recovery BETWEEN 0 AND 1),
    confidence_recovery             NUMERIC(4,3) CHECK (confidence_recovery BETWEEN 0 AND 1),
    emotional_recovery             NUMERIC(4,3) CHECK (emotional_recovery BETWEEN 0 AND 1),
    resilience                  NUMERIC(4,3) CHECK (resilience BETWEEN 0 AND 1),

    -- ---- §10 Context ----
    home_comfort                 NUMERIC(4,3) CHECK (home_comfort BETWEEN 0 AND 1),
    away_comfort                 NUMERIC(4,3) CHECK (away_comfort BETWEEN 0 AND 1),
    playoff_mindset                NUMERIC(4,3) CHECK (playoff_mindset BETWEEN 0 AND 1),
    rivalry_intensity              NUMERIC(4,3) CHECK (rivalry_intensity BETWEEN 0 AND 1),
    elimination_pressure            NUMERIC(4,3) CHECK (elimination_pressure BETWEEN 0 AND 1),

    -- ---- §11 Behavioral ----
    shot_assertiveness             NUMERIC(4,3) CHECK (shot_assertiveness BETWEEN 0 AND 1),
    pass_assertiveness             NUMERIC(4,3) CHECK (pass_assertiveness BETWEEN 0 AND 1),
    drive_assertiveness             NUMERIC(4,3) CHECK (drive_assertiveness BETWEEN 0 AND 1),
    defensive_assertiveness           NUMERIC(4,3) CHECK (defensive_assertiveness BETWEEN 0 AND 1),
    decision_speed                NUMERIC(4,3) CHECK (decision_speed BETWEEN 0 AND 1),

    -- ---- §12 Composite ----
    mental_readiness               NUMERIC(4,3) CHECK (mental_readiness BETWEEN 0 AND 1),
    psychological_stability           NUMERIC(4,3) CHECK (psychological_stability BETWEEN 0 AND 1),
    competitive_index              NUMERIC(4,3) CHECK (competitive_index BETWEEN 0 AND 1),
    confidence_index               NUMERIC(4,3) CHECK (confidence_index BETWEEN 0 AND 1),
    pressure_resilience_index          NUMERIC(4,3) CHECK (pressure_resilience_index BETWEEN 0 AND 1),
    emotional_balance              NUMERIC(4,3) CHECK (emotional_balance BETWEEN 0 AND 1),

    -- ==== FORMULA_PSYCHOLOGICAL_STRESS_INDEX §5.3.2 ====
    psychological_stress_index         NUMERIC(4,3) CHECK (psychological_stress_index BETWEEN 0 AND 1),
    -- Ajustes latentes descendentes (output §5.3.2; cruza con PLAYER_LATENT_VARIABLES §6)
    player_confidence_adj            NUMERIC(4,3) CHECK (player_confidence_adj BETWEEN 0 AND 1),
    player_emotional_stability_adj      NUMERIC(4,3) CHECK (player_emotional_stability_adj BETWEEN 0 AND 1),
    player_pressure_response_adj       NUMERIC(4,3) CHECK (player_pressure_response_adj BETWEEN 0 AND 1),
    player_focus_adj                NUMERIC(4,3) CHECK (player_focus_adj BETWEEN 0 AND 1),

    -- ==== MEDIA_AND_SOCIAL_SENTIMENT_VARIABLES §3 Social Media Sentiment ====
    social_media_sentiment_score        NUMERIC(5,4),
    social_media_toxicity_index         NUMERIC(5,4),
    social_media_support_ratio          NUMERIC(5,4),
    mention_volume_24h               INTEGER,
    mention_volume_trend              NUMERIC(6,4),
    sentiment_volatility              NUMERIC(6,4),
    fanbase_approval_index            NUMERIC(5,4),
    negative_sentiment_spike_flag        BOOLEAN NOT NULL DEFAULT false,
    viral_moment_flag                BOOLEAN NOT NULL DEFAULT false,

    -- ---- §4 Trade Rumor Distraction ----
    trade_rumor_volume_index           NUMERIC(6,4),
    trade_rumor_credibility_score        NUMERIC(5,4),
    trade_rumor_source_tier            SMALLINT,
    rumor_induced_distraction_index       NUMERIC(5,4),
    rumor_cycle_duration_days           SMALLINT,
    rumor_proximity_to_deadline_days       SMALLINT,

    -- ---- §5 Revenge Game ----
    revenge_game_flag                BOOLEAN NOT NULL DEFAULT false,
    revenge_game_motivation_multiplier      NUMERIC(5,3) NOT NULL DEFAULT 1.0,
    former_team_opponent_flag           BOOLEAN NOT NULL DEFAULT false,
    departure_type                  TEXT,
    departure_recency_games            SMALLINT,
    first_meeting_flag                BOOLEAN NOT NULL DEFAULT false,
    rivalry_carryover_index            NUMERIC(5,4),

    -- ---- §6 Awards Narrative Momentum ----
    award_narrative_momentum_index        NUMERIC(5,4),
    media_mvp_mention_share             NUMERIC(5,4),
    voter_narrative_bias_index           NUMERIC(5,4),
    national_tv_exposure_index           NUMERIC(5,4),
    market_size_media_multiplier          NUMERIC(5,3),
    late_season_narrative_surge          NUMERIC(5,4),
    award_fatigue_penalty              NUMERIC(5,4),

    -- ==== §7 Composite Narrative (FORMULA_COMPOSITE_NARRATIVE_VARIABLE §5.3.1 output) ====
    total_external_pressure_index        NUMERIC(5,4),
    narrative_momentum_direction         TEXT CHECK (narrative_momentum_direction IN ('positive', 'negative', 'neutral')),
    narrative_stability               NUMERIC(5,4),
    distraction_to_focus_ratio           NUMERIC(6,4),

    -- ---- Reliability (PSYCHOLOGICAL §14 + MEDIA_AND_SOCIAL_SENTIMENT §8, deduplicado) ----
    model_confidence                 NUMERIC(5,4),
    source_credibility_confidence        NUMERIC(5,4),
    observation_confidence             NUMERIC(5,4),
    data_completeness                 NUMERIC(5,4),
    uncertainty                    NUMERIC(5,4),
    posterior_variance                NUMERIC(9,6),
    signal_to_noise                  NUMERIC(8,4),

    extra_jsonb                    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN psychological_narrative_log.psychological_stress_index IS
    'Output de FORMULA_PSYCHOLOGICAL_STRESS_INDEX (06_FORMULAS_CORE.md §5.3.2). Alimenta PSYCHFAT en biometrics_and_fatigue_log (canal narrativo, η_narr=0.5) — consumo dual intencional, no dependencia circular (ambas fórmulas tratan el valor del otro como exógeno en el instante t).';
COMMENT ON COLUMN psychological_narrative_log.total_external_pressure_index IS
    'Output de FORMULA_COMPOSITE_NARRATIVE_VARIABLE (06_FORMULAS_CORE.md §5.3.1); es uno de los 7 inputs ponderados de psychological_stress_index en la misma fila.';

CREATE INDEX IF NOT EXISTS idx_psych_narrative_player_ts
    ON psychological_narrative_log (player_id, measurement_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_psych_narrative_game
    ON psychological_narrative_log (game_id) WHERE game_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_psych_narrative_team
    ON psychological_narrative_log (team_id, measurement_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_psych_narrative_season
    ON psychological_narrative_log (season_id);
CREATE INDEX IF NOT EXISTS idx_psych_narrative_revenge
    ON psychological_narrative_log (player_id, game_id) WHERE revenge_game_flag = true;
CREATE INDEX IF NOT EXISTS idx_psych_narrative_ts_brin
    ON psychological_narrative_log USING BRIN (measurement_timestamp);


-- =============================================================================
-- BLOQUE 2.4: FINANCIAL_INCENTIVE_STATE
-- Fuente: docs/NUSE/09_VARIABLES/FINANCIAL_INCENTIVE_VARIABLES.md (§2-§9)
--       + 06_FORMULAS_CORE.md §5.4 (FORMULA_COMPOSITE_INCENTIVE_VARIABLE)
-- Grano: una fila por (player_id, as_of_timestamp) — snapshot continuo de
-- proximidad a incentivos, no un evento discreto; de ahí el sufijo "_state"
-- que el propio Comandante ya escogió para esta tabla.
-- contract_id se deja como UUID SIN FK: la tabla `contracts` vive en el
-- dominio CBA/financiero (CONTRACT_VARIABLES / SALARY_CAP_VARIABLES), fuera
-- del alcance de 01_core_entities.sql — no se asume su existencia todavía.
-- =============================================================================
CREATE TABLE IF NOT EXISTS financial_incentive_state (
    financial_incentive_state_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- ---- Identity / scoping (§2) ----
    player_id                    UUID NOT NULL REFERENCES players (player_id),
    team_id                      UUID REFERENCES teams (team_id),
    coach_id                     UUID REFERENCES coaches (coach_id),
    contract_id                   UUID,     -- ver nota de BLOQUE 2.4: FK diferida a una futura tabla `contracts`
    game_id                      UUID REFERENCES games (game_id),
    season_id                    UUID REFERENCES seasons (season_id),
    games_remaining_in_season          SMALLINT,
    as_of_timestamp                 TIMESTAMPTZ NOT NULL,

    -- ---- §3 Stat-Padding Incentive Proximity ----
    bonus_threshold_stat_type            TEXT,           -- taxonomía abierta: 'ppg','rpg','apg','games_played',...
    bonus_threshold_target_value          NUMERIC(10,3),
    current_season_stat_pace            NUMERIC(10,3),
    required_per_game_pace_to_qualify       NUMERIC(10,3),
    threshold_proximity_index            NUMERIC(6,4),
    games_remaining_to_qualify           SMALLINT,
    stat_padding_usage_spike_flag          BOOLEAN NOT NULL DEFAULT false,
    garbage_time_stat_padding_flag         BOOLEAN NOT NULL DEFAULT false,
    bonus_qualification_probability        NUMERIC(5,4),

    -- ---- §4 Contract Year Multiplier ----
    contract_year_flag                BOOLEAN NOT NULL DEFAULT false,
    contract_year_performance_multiplier      NUMERIC(5,3) NOT NULL DEFAULT 1.0,
    contract_year_usage_increase           NUMERIC(6,4),
    contract_year_effort_index            NUMERIC(5,4),
    contract_year_defensive_effort_delta       NUMERIC(6,4),
    pre_contract_year_baseline            NUMERIC(8,4),
    post_extension_regression_risk          NUMERIC(5,4),
    walk_year_minutes_request_frequency       SMALLINT,

    -- ---- §5 Salary Cap & Luxury Tax Rotation Pressure ----
    -- (excluido explícitamente de FORMULA_COMPOSITE_INCENTIVE_VARIABLE §5.4.1 —
    --  alimenta ROTATION_ALLOCATION_VARIABLES por el canal de asignación, no
    --  el canal de esfuerzo; se persiste aquí igualmente porque pertenece de
    --  forma nativa a FINANCIAL_INCENTIVE_VARIABLES §5, no a otra tabla.)
    luxury_tax_rotation_pressure           NUMERIC(5,4),
    load_management_tax_incentive          NUMERIC(5,4),
    veteran_rest_tax_correlation           NUMERIC(5,4),
    second_apron_minutes_restriction_flag      BOOLEAN NOT NULL DEFAULT false,
    tanking_financial_incentive_index        NUMERIC(5,4),
    expiring_contract_minutes_bump          NUMERIC(6,4),
    buyout_candidate_minutes_reduction        NUMERIC(6,4),

    -- ---- §6 Trade Showcase ----
    trade_showcase_flag                BOOLEAN NOT NULL DEFAULT false,
    forced_minutes_for_value_index          NUMERIC(5,4),
    pre_deadline_usage_spike             NUMERIC(6,4),
    showcase_role_expansion_flag           BOOLEAN NOT NULL DEFAULT false,
    value_maximization_minutes_allocation      NUMERIC(6,3),
    showcase_shot_volume_adjustment         NUMERIC(6,4),

    -- ---- §7 Coaching Incentive Alignment ----
    coach_contract_year_flag             BOOLEAN NOT NULL DEFAULT false,
    coach_win_bonus_proximity             NUMERIC(5,4),
    coach_playoff_bonus_proximity          NUMERIC(5,4),
    coach_job_security_index             NUMERIC(5,4),
    coach_rotation_conservatism_under_pressure   NUMERIC(5,4),

    -- ==== §8 Composite Incentive (FORMULA_COMPOSITE_INCENTIVE_VARIABLE §5.4.1) ====
    contract_term                    NUMERIC(6,4),    -- intermedio: CONTRACT_YEAR_FLAG·(multiplier-1)
    urgency_index                    NUMERIC(6,4),    -- intermedio: THRESHOLD_PROXIMITY_INDEX / (1+GAMES_REMAINING_TO_QUALIFY)
    total_financial_distortion_index        NUMERIC(6,4),
    incentive_alignment_score             NUMERIC(5,4),
    organizational_vs_individual_incentive_conflict  NUMERIC(5,4),
    incentive_driven_usage_delta           NUMERIC(6,4),
    -- Ajustes latentes descendentes (output §5.4.1; cruza con PLAYER_LATENT_VARIABLES §8)
    player_competitive_motor_adj           NUMERIC(6,4),
    player_consistent_effort_adj           NUMERIC(6,4),

    -- ---- §9 Reliability ----
    model_confidence                 NUMERIC(5,4),
    data_completeness                 NUMERIC(5,4),
    observation_confidence             NUMERIC(5,4),
    uncertainty                    NUMERIC(5,4),
    posterior_variance                NUMERIC(9,6),
    signal_to_noise                  NUMERIC(8,4),
    contract_data_verifiability           NUMERIC(5,4),

    extra_jsonb                    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN financial_incentive_state.contract_id IS
    'Referencia lógica a una futura tabla contracts (dominio CBA/financiero). Sin FK física hasta que ese bloque se despliegue — no asumir su existencia.';
COMMENT ON COLUMN financial_incentive_state.luxury_tax_rotation_pressure IS
    'FINANCIAL_INCENTIVE_VARIABLES §5. Explícitamente EXCLUIDA como input de FORMULA_COMPOSITE_INCENTIVE_VARIABLE (canal de esfuerzo); se compone únicamente aguas abajo dentro de ROTATION_MANAGEMENT_VARIABLES §4, per 04_CAUSAL_GRAPH.md §18.3.';

CREATE INDEX IF NOT EXISTS idx_financial_incentive_player_ts
    ON financial_incentive_state (player_id, as_of_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_financial_incentive_game
    ON financial_incentive_state (game_id) WHERE game_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_financial_incentive_team
    ON financial_incentive_state (team_id, season_id);
CREATE INDEX IF NOT EXISTS idx_financial_incentive_contract_year
    ON financial_incentive_state (player_id, season_id) WHERE contract_year_flag = true;
CREATE INDEX IF NOT EXISTS idx_financial_incentive_coach
    ON financial_incentive_state (coach_id) WHERE coach_id IS NOT NULL;


-- =============================================================================
-- BLOQUE 2.5: TABLAS DE LOOKUP DE SOPORTE PARA VEGAS_MARKET_CALIBRATION
-- Fuente: docs/NUSE/09_VARIABLES/VEGAS_MARKET_VARIABLES.md §15 (sportsbooks
-- rastreados) y §6-§9 (tipos de player prop). Ambas son taxonomías ABIERTAS
-- que crecerán (nuevos libros, nuevos tipos de prop) — por la regla ya
-- ratificada en 00_extensions_and_types.sql BLOQUE 0 punto 3, se modelan
-- como tabla de lookup normalizada, NO como ENUM.
-- =============================================================================
CREATE TABLE IF NOT EXISTS sportsbooks (
    sportsbook_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT NOT NULL UNIQUE,
    short_code         VARCHAR(10) NOT NULL UNIQUE,
    is_sharp_book       BOOLEAN NOT NULL DEFAULT false,   -- Pinnacle/Circa: libros "sharp" de referencia
    is_active          BOOLEAN NOT NULL DEFAULT true,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_sportsbooks_updated_at BEFORE UPDATE ON sportsbooks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Conjunto canónico rastreado (VEGAS_MARKET_VARIABLES §15: TRACKED_SPORTSBOOK_SET)
INSERT INTO sportsbooks (name, short_code, is_sharp_book) VALUES
    ('DraftKings',        'DK',    false),
    ('FanDuel',          'FD',    false),
    ('BetMGM',           'MGM',   false),
    ('Caesars Sportsbook',    'CZR',   false),
    ('ESPN BET',          'ESPN',  false),
    ('Pinnacle',          'PINN',  true),
    ('Circa Sports',        'CIRCA', true)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS vegas_market_types (
    market_type_code   TEXT PRIMARY KEY,     -- 'spread','total','moneyline','prop_points',...
    market_category    TEXT NOT NULL CHECK (market_category IN ('game_line', 'player_prop', 'period_derivative', 'futures')),
    stat_type        prop_type_enum,       -- reutiliza ENUM de 00_extensions_and_types.sql; NULL si market_category <> 'player_prop'
    description       TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((market_category = 'player_prop') = (stat_type IS NOT NULL) OR market_category <> 'player_prop')
);

-- §3-§10: spread/total/moneyline (game_line) + props core/combinados/specialty + period/derivative
INSERT INTO vegas_market_types (market_type_code, market_category, stat_type, description) VALUES
    ('spread',              'game_line',         NULL,                       'Línea de puntos (hándicap)'),
    ('total',               'game_line',         NULL,                       'Total de puntos Over/Under'),
    ('moneyline',            'game_line',         NULL,                       'Ganador directo (moneyline)'),
    ('prop_points',           'player_prop',        'points',                    'Prop de puntos del jugador'),
    ('prop_rebounds',          'player_prop',        'rebounds',                   'Prop de rebotes del jugador'),
    ('prop_assists',          'player_prop',        'assists',                    'Prop de asistencias del jugador'),
    ('prop_threes_made',        'player_prop',        'three_pointers_made',              'Prop de triples anotados'),
    ('prop_stocks',           'player_prop',        'steals_plus_blocks',              'Prop combinado robos+tapones'),
    ('prop_pra',             'player_prop',        'points_rebounds_assists',            'Prop combinado puntos+rebotes+asistencias'),
    ('prop_pr',             'player_prop',        'points_rebounds',               'Prop combinado puntos+rebotes'),
    ('prop_pa',             'player_prop',        'points_assists',                'Prop combinado puntos+asistencias'),
    ('prop_ra',             'player_prop',        'rebounds_assists',               'Prop combinado rebotes+asistencias'),
    ('prop_double_double',       'player_prop',        'double_double',                 'Probabilidad de doble-doble'),
    ('prop_triple_double',       'player_prop',        'triple_double',                 'Probabilidad de triple-doble'),
    ('prop_first_basket',        'player_prop',        'first_basket',                  'Primera canasta del partido'),
    ('first_half_spread',        'period_derivative',     NULL,                       'Línea de puntos del primer tiempo'),
    ('first_half_total',        'period_derivative',     NULL,                       'Total del primer tiempo'),
    ('first_half_moneyline',      'period_derivative',     NULL,                       'Moneyline del primer tiempo'),
    ('first_quarter_spread',      'period_derivative',     NULL,                       'Línea de puntos del primer cuarto'),
    ('first_quarter_total',       'period_derivative',     NULL,                       'Total del primer cuarto')
ON CONFLICT (market_type_code) DO NOTHING;


-- =============================================================================
-- BLOQUE 2.6: VEGAS_MARKET_CALIBRATION
-- Fuente: docs/NUSE/09_VARIABLES/VEGAS_MARKET_VARIABLES.md (§2-§13, §15-§17)
--       + docs/NUSE/09_VARIABLES/CALIBRATION_VARIABLES.md (§2-§3, §5)
--       + docs/NUSE/09_VARIABLES/PLAYER_LATENT_VARIABLES.md (§14)
--       + 06_FORMULAS_CORE.md §5.5 (FORMULA_CLOSING_LINE_VALUE,
--         FORMULA_CONFIDENCE_RECALIBRATION)
-- Grano: una fila por (game_id, market_type_code, player_id?, sportsbook_id?,
-- snapshot_timestamp) — formato largo/normalizado (ver nota de diseño en el
-- header del archivo, punto 6). player_id es NOT NULL únicamente cuando
-- vegas_market_types.market_category = 'player_prop'. sportsbook_id es NULL
-- únicamente en la fila de consenso multi-libro (is_consensus_row = true).
-- LIVE/in-game odds (§14) quedan fuera de alcance (ver punto 7 del header).
-- =============================================================================
CREATE TABLE IF NOT EXISTS vegas_market_calibration (
    market_snapshot_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- ---- Identity / scoping (§2) ----
    game_id                UUID NOT NULL REFERENCES games (game_id),
    player_id               UUID REFERENCES players (player_id),          -- NOT NULL solo si market_category='player_prop'
    team_id                UUID REFERENCES teams (team_id),
    season_id               UUID REFERENCES seasons (season_id),
    sportsbook_id             UUID REFERENCES sportsbooks (sportsbook_id),     -- NULL solo si is_consensus_row=true
    market_type_code           TEXT NOT NULL REFERENCES vegas_market_types (market_type_code),
    snapshot_timestamp          TIMESTAMPTZ NOT NULL,
    is_opening_line            BOOLEAN NOT NULL DEFAULT false,
    is_closing_line            BOOLEAN NOT NULL DEFAULT false,
    is_consensus_row            BOOLEAN NOT NULL DEFAULT false,     -- true => fila multi-libro agregada (sportsbook_id NULL)

    -- ==== §3-§9 Forma genérica línea/cuota — cubre spread, total, moneyline
    --      y los ~15 tipos de player prop a través de vegas_market_types ====
    line_value               NUMERIC(8,2),    -- puntos de spread / total / línea de stat del prop (NULL en moneyline puro)
    side_a_odds               INTEGER,       -- cuota americana: home / over
    side_b_odds               INTEGER,       -- cuota americana: away / under
    side_a_implied_probability       NUMERIC(6,5),
    side_b_implied_probability       NUMERIC(6,5),
    side_a_no_vig_probability       NUMERIC(6,5),
    side_b_no_vig_probability       NUMERIC(6,5),
    vig_pct                 NUMERIC(6,5),
    movement_delta             NUMERIC(8,3),
    movement_direction           TEXT CHECK (movement_direction IN ('up', 'down', 'unchanged')),
    key_number_proximity          NUMERIC(4,2),   -- específico de spread; NULL en el resto

    -- ==== §11 Closing Line Value — FORMULA_CLOSING_LINE_VALUE §5.5.1 ====
    closing_line_consensus         NUMERIC(8,2),   -- se puebla en la fila is_consensus_row=true
    clv_probability_delta         NUMERIC(6,5),
    clv_pct_points             NUMERIC(6,3),
    clv_odds_delta             INTEGER,
    beat_close_flag             BOOLEAN,
    clv_rolling_average_by_model      NUMERIC(6,5),
    clv_sample_size             INTEGER,
    clv_confidence_interval_low      NUMERIC(6,5),
    clv_confidence_interval_high      NUMERIC(6,5),

    -- ---- §12 Steam / Line Movement ----
    steam_move_flag             BOOLEAN NOT NULL DEFAULT false,
    steam_move_magnitude          NUMERIC(6,3),
    steam_move_velocity           NUMERIC(8,4),
    steam_move_origin_book_id       UUID REFERENCES sportsbooks (sportsbook_id),
    reverse_line_movement_flag       BOOLEAN NOT NULL DEFAULT false,
    line_freeze_flag             BOOLEAN NOT NULL DEFAULT false,
    total_line_moves_pregame        INTEGER,
    movement_volatility_index       NUMERIC(6,4),

    -- ---- §13 Sharp vs Public Money ----
    ticket_pct_side_a            NUMERIC(5,2),
    ticket_pct_side_b            NUMERIC(5,2),
    money_pct_side_a             NUMERIC(5,2),
    money_pct_side_b             NUMERIC(5,2),
    ticket_money_divergence         NUMERIC(5,2),
    sharp_side_indicator           TEXT CHECK (sharp_side_indicator IN ('side_a', 'side_b', 'none')),
    public_fade_score            NUMERIC(5,4),
    square_sharp_book_divergence      NUMERIC(6,4),

    -- ---- §16 Market Efficiency & Model Edge — FORMULA_CLOSING_LINE_VALUE §5.5.1 ----
    market_efficiency_index         NUMERIC(5,4),
    nuse_internal_win_probability      NUMERIC(6,5),   -- proyección propia de NUSE, no declarada en VEGAS_MARKET_VARIABLES
    model_vs_market_edge          NUMERIC(6,5),
    expected_value_index          NUMERIC(6,4),
    kelly_fraction_suggested        NUMERIC(6,5),
    market_consensus_probability      NUMERIC(6,5),
    arbitrage_opportunity_flag       BOOLEAN NOT NULL DEFAULT false,
    middle_opportunity_flag         BOOLEAN NOT NULL DEFAULT false,

    -- ==== CALIBRATION_VARIABLES §3, §5 — inputs de FORMULA_CONFIDENCE_RECALIBRATION ====
    predicted_probability          NUMERIC(6,5),
    observed_frequency            NUMERIC(6,5),
    reliability_index            NUMERIC(5,4),
    expected_calibration_error       NUMERIC(6,5),

    -- ==== PLAYER_LATENT_VARIABLES §14 — output de FORMULA_CONFIDENCE_RECALIBRATION §5.5.2 ====
    -- Poblado únicamente en filas player_prop donde NUSE rastrea el posterior
    -- de un jugador concreto; NULL en filas game_line puras.
    player_prior_weight           NUMERIC(14,6),
    player_observation_weight        NUMERIC(14,6),
    player_posterior_variance        NUMERIC(14,8),

    -- ---- §17 Reliability ----
    model_confidence             NUMERIC(5,4),
    data_completeness            NUMERIC(5,4),
    book_coverage_confidence        NUMERIC(5,4),
    signal_to_noise              NUMERIC(8,4),

    extra_jsonb                JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (
        (is_consensus_row AND sportsbook_id IS NULL)
        OR (NOT is_consensus_row AND sportsbook_id IS NOT NULL)
    )
);

COMMENT ON COLUMN vegas_market_calibration.player_id IS
    'NOT NULL cuando vegas_market_types.market_category = ''player_prop'' para esta fila; NULL en spread/total/moneyline/period_derivative. No se declara CHECK cruzado entre tablas (Postgres no lo permite sin trigger) — validar en la capa de ingesta (Cerebro/Motor).';
COMMENT ON COLUMN vegas_market_calibration.player_posterior_variance IS
    'Output recursivo de FORMULA_CONFIDENCE_RECALIBRATION (06_FORMULAS_CORE.md §5.5.2): el posterior de la fila anterior (por player_id+snapshot_timestamp) se convierte en el prior de esta fila. Única fórmula del documento con permiso explícito para esta recursión (Calibration Exception, 04_CAUSAL_GRAPH.md §7.1) — NUNCA debe escribir en una variable latente PLAYER_* de tipo habilidad.';
COMMENT ON COLUMN vegas_market_calibration.closing_line_consensus IS
    'VEGAS_MARKET_VARIABLES §15. Se puebla en la fila is_consensus_row=true de cada (game_id, market_type_code[, player_id]); las filas por-libro individual dejan esta columna NULL.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_vegas_market_snapshot
    ON vegas_market_calibration (
        game_id,
        market_type_code,
        COALESCE(player_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(sportsbook_id, '00000000-0000-0000-0000-000000000000'::uuid),
        snapshot_timestamp
    );
CREATE INDEX IF NOT EXISTS idx_vegas_market_game_type
    ON vegas_market_calibration (game_id, market_type_code, snapshot_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_vegas_market_player_prop
    ON vegas_market_calibration (player_id, market_type_code, snapshot_timestamp DESC)
    WHERE player_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vegas_market_closing
    ON vegas_market_calibration (game_id, market_type_code) WHERE is_closing_line = true;
CREATE INDEX IF NOT EXISTS idx_vegas_market_clv_by_model
    ON vegas_market_calibration (market_type_code, snapshot_timestamp DESC) WHERE clv_probability_delta IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vegas_market_sportsbook
    ON vegas_market_calibration (sportsbook_id) WHERE sportsbook_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vegas_market_ts_brin
    ON vegas_market_calibration USING BRIN (snapshot_timestamp);


-- =============================================================================
-- FIN DE BLOQUE 2 — 5 tablas de series temporales + 2 tablas de lookup de
-- soporte, cubriendo los 5 dominios microscópicos ratificados en
-- 06_FORMULAS_CORE.md v2.0.0 §5: biométrico/fatiga, humano/arbitraje,
-- psicológico/narrativo, incentivo financiero y calibración Vegas.
-- =============================================================================